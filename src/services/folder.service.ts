import bcrypt from 'bcryptjs'
import { UTApi } from 'uploadthing/server'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { FolderEntity } from '../entity/folder.entity'
import { AppError } from '../errors/AppError'
import { AccessType } from '../types/common'
import { FolderPayload } from '../types/folder'
import { decryptStorageKey } from '../utils/fileProtection'

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
    password: hashedPassword,
  })

  return folderRepository.save(folder)
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

const deleteFolder = async (folder: FolderEntity) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  if (folder.files && folder.files.length > 0) {
    const storageKeys = folder.files.map((f) => decryptStorageKey(f.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))

    const utapi = new UTApi()
    await utapi.deleteFiles(storageKeys)
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
export { createFolderService, deleteFolderByIdService, deleteFolderByTokenService, getFolderByIdService, getFolderByTokenService, unlockFolderService }

