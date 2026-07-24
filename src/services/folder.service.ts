import bcrypt from 'bcryptjs'
import { Brackets, FindOptionsWhere, ILike, LessThanOrEqual, SelectQueryBuilder } from 'typeorm'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { FolderEntity } from '../entity/folder.entity'
import { AppError } from '../errors/AppError'
import { AccessType } from '../types/common'
import { FolderPayload, RequestFilePayload } from '../types/folder'
import { decryptStorageKey } from '../utils/fileProtection'
import { deleteStorageFiles } from '../utils/storage'
import { uploadFileService } from './file.service'

const REQUEST_EXPIRY_MS = 2 * 60 * 60 * 1000

const createFolderService = async (payload: FolderPayload) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  let hashedPassword: string | undefined

  if (payload.accessType === 'protected' && payload.password) {
    const salt = bcrypt.genSaltSync(10)
    hashedPassword = bcrypt.hashSync(payload.password, salt)
  }

  const files = payload.fileIds.map((id) => fileRepository.create({ id }))

  const folder = folderRepository.create({
    folderName: payload.folderName,
    shareToken: payload.shareToken,
    files,
    expireAt: payload.expireAt,
    accessType: payload.accessType,
    clientId: payload.clientId,
    ownerId: payload.ownerId ?? null,
    password: hashedPassword,
  })

  return folderRepository.save(folder)
}

const requestOwnerScope = (qb: SelectQueryBuilder<FolderEntity>, clientId?: string, ownerId?: string | null) =>
  qb.andWhere(
    new Brackets((where) => {
      if (clientId) where.orWhere('folder.clientId = :clientId', { clientId })
      if (ownerId) where.orWhere('folder.ownerId = :ownerId', { ownerId })
    }),
  )

const hasActiveRequestOfType = async ({ clientId, ownerId, accessType }: { clientId?: string, ownerId?: string | null, accessType: AccessType }) => {
  if (!clientId && !ownerId) return false

  const qb = useTypeORM(FolderEntity)
    .createQueryBuilder('folder')
    .where('folder.acceptsUploads = :accepts', { accepts: true })
    .andWhere('folder.expireAt > :now', { now: new Date() })
    .andWhere('folder.accessType = :accessType', { accessType })

  return (await requestOwnerScope(qb, clientId, ownerId).getCount()) > 0
}

const getActiveRequestsService = async ({ clientId, ownerId }: { clientId?: string, ownerId?: string | null }) => {
  if (!clientId && !ownerId) return []

  const qb = useTypeORM(FolderEntity)
    .createQueryBuilder('folder')
    .loadRelationCountAndMap('folder.fileCount', 'folder.files')
    .where('folder.acceptsUploads = :accepts', { accepts: true })
    .andWhere('folder.expireAt > :now', { now: new Date() })

  return requestOwnerScope(qb, clientId, ownerId).orderBy('folder.createdAt', 'DESC').getMany()
}

const createUploadRequestService = async (payload: { folderName?: string, shareToken: string, ownerId?: string | null, clientId?: string, accessType?: AccessType, password?: string }) => {
  const folderRepository = useTypeORM(FolderEntity)

  const accessType = payload.accessType ?? AccessType.PUBLIC

  if (await hasActiveRequestOfType({ clientId: payload.clientId, ownerId: payload.ownerId, accessType })) {
    throw new AppError(`You already have an active ${accessType} file request. Resume or end it before creating a new one.`, 409)
  }

  let hashedPassword: string | undefined

  if (accessType === AccessType.PROTECTED) {
    if (!payload.password) throw new AppError('A password is required for protected requests', 400)

    const salt = bcrypt.genSaltSync(10)
    hashedPassword = bcrypt.hashSync(payload.password, salt)
  }

  const folder = folderRepository.create({
    folderName: payload.folderName?.trim() || 'File request',
    shareToken: payload.shareToken,
    files: [],
    accessType,
    password: hashedPassword,
    acceptsUploads: true,
    clientId: payload.clientId,
    ownerId: payload.ownerId ?? null,
    expireAt: new Date(Date.now() + REQUEST_EXPIRY_MS),
  })

  return folderRepository.save(folder)
}

const addFilesToRequestService = async (token: string, files: RequestFilePayload[], password?: string) => {
  if (!files?.length) throw new AppError('No files to upload', 400)

  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { shareToken: token },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)
  if (!folder.acceptsUploads) throw new AppError('This folder is not accepting uploads', 400)

  if (folder.accessType === AccessType.PROTECTED) {
    if (!password) throw new AppError('Password is required', 401)

    const isValid = await bcrypt.compare(password, folder.password)
    if (!isValid) throw new AppError('Invalid password', 401)
  }

  const expireAt = new Date(Date.now() + REQUEST_EXPIRY_MS)

  const savedFiles: FileEntity[] = []
  for (const file of files) {
    const saved = await uploadFileService({
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      storageKey: file.storageKey,
      clientId: file.clientId,
      deviceInfo: file.deviceInfo,
      accessType: AccessType.PUBLIC,
      ownerId: null,
      expireAt,
      downloadCount: 0,
    })
    savedFiles.push(saved)
  }

  folder.files = [...folder.files, ...savedFiles]
  await folderRepository.save(folder)

  return savedFiles
}

const getFolderByTokenService = async (token: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { shareToken: token },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  if (folder.accessType === AccessType.PROTECTED) {
    return {
      accessType: folder.accessType,
      folderName: folder.folderName,
      shareToken: folder.shareToken,
      acceptsUploads: folder.acceptsUploads,
      expireAt: folder.expireAt,
      files: [],
    }
  }

  return folder
}

const unlockFolderService = async (token: string, plainPassword: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { shareToken: token },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  if (folder.accessType !== AccessType.PROTECTED) {
    throw new AppError('This folder is not password protected', 400)
  }

  const isValid = await bcrypt.compare(plainPassword, folder.password)
  if (!isValid) throw new AppError('Invalid password', 401)

  return folder
}

const getFolderByIdService = async (id: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { id },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  return folder
}

const moveFileToFolderService = async (folderId: string, fileId: string, ownerId: string) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({ where: { id: folderId } })
  if (!folder) throw new AppError('Folder not found', 404)
  if (folder.ownerId !== ownerId) throw new AppError('You do not have access to this folder', 403)

  const file = await fileRepository.findOne({ where: { id: fileId } })
  if (!file) throw new AppError('File not found', 404)
  if (file.ownerId !== ownerId) throw new AppError('You do not have access to this file', 403)

  const currentFolders = await folderRepository
    .createQueryBuilder('folder')
    .innerJoin('folder.files', 'file', 'file.id = :fileId', { fileId })
    .getMany()

  const alreadyInTarget = currentFolders.some((current) => current.id === folderId)

  for (const current of currentFolders) {
    if (current.id === folderId) continue
    await folderRepository.createQueryBuilder().relation(FolderEntity, 'files').of(current.id).remove(fileId)
  }

  if (!alreadyInTarget) {
    await folderRepository.createQueryBuilder().relation(FolderEntity, 'files').of(folderId).add(fileId)
  }

  return getFolderByIdService(folderId)
}

const getFoldersByOwner = async (ownerId: string, search?: string) => {
  const where: FindOptionsWhere<FolderEntity> = { ownerId }
  const term = search?.trim()
  if (term) where.folderName = ILike(`%${term}%`)

  return useTypeORM(FolderEntity).find({ where, order: { createdAt: 'DESC' } })
}

const deleteFolder = async (folder: FolderEntity) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  if (folder.files && folder.files.length > 0) {
    const storageKeys = folder.files.map((f) => decryptStorageKey(f.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))

    await deleteStorageFiles(storageKeys)
    await fileRepository.remove(folder.files)
  }

  await folderRepository.remove(folder)
}

const deleteFolderByTokenService = async (token: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { shareToken: token },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  await deleteFolder(folder)
}

const deleteFolderByIdService = async (id: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { id },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  await deleteFolder(folder)
}

const deleteExpiredRequestFolders = async () => {
  const folderRepository = useTypeORM(FolderEntity)

  const expiredFolders = await folderRepository.find({
    where: { acceptsUploads: true, expireAt: LessThanOrEqual(new Date()) },
    relations: { files: true },
  })

  for (const folder of expiredFolders) {
    await deleteFolder(folder)
  }

  return { deleted: expiredFolders.length }
}

export { addFilesToRequestService, createFolderService, createUploadRequestService, deleteExpiredRequestFolders, deleteFolderByIdService, deleteFolderByTokenService, getActiveRequestsService, getFolderByIdService, getFolderByTokenService, getFoldersByOwner, moveFileToFolderService, unlockFolderService }

