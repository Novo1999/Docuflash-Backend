import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { DeepPartial, FindOptionsWhere, ILike } from 'typeorm'
import { PREVIEWABLE_TYPES } from '../constants'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { AppError } from '../errors/AppError'
import { AccessType } from '../types/common'
import { FileType } from '../types/file'
import { signAccessToken, verifyAccessToken } from '../utils/accessToken'
import { decryptStorageKey, encryptStorageKey } from '../utils/fileProtection'
import { deleteStorageFiles } from '../utils/storage'

const getFileByToken = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)
  const fileByToken = await fileRepository.findOne({ where: { shareToken: token }, relations: { folder: true } })
  if (!fileByToken) throw new AppError('File not found', 404)
  return fileByToken
}

const deleteFileById = async (id: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ id })
  if (!file) throw new AppError('File not found', 404)

  const storageKey = decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)

  await deleteStorageFiles([storageKey])

  await fileRepository.remove(file)
}
const uploadFileService = async (payload: DeepPartial<FileEntity>) => {
  const shareToken = crypto.randomBytes(16).toString('hex')

  let hashedPassword: string | undefined
  let encryptedStorageKey: string | undefined
  let salt: string | undefined

  if (payload.accessType === 'protected' && payload.password) {
    salt = bcrypt.genSaltSync(10)
    hashedPassword = bcrypt.hashSync(payload.password, salt)
    encryptedStorageKey = encryptStorageKey(payload.storageKey!, payload.password, salt)
  }

  const masterEncryptedStorageKey = encryptStorageKey(payload.storageKey!, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)

  const fileRepository = useTypeORM(FileEntity)
  const file = fileRepository.create({
    ...payload,
    downloadCount: payload.downloadCount ?? 0,
    password: hashedPassword,
    shareToken,
    storageKey: encryptedStorageKey ?? payload.storageKey,
    masterEncryptedStorageKey,
    salt,
  })

  return fileRepository.save(file)
}
const verifyFilePassword = async (token: string, password: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })
  if (!file) throw new AppError('File not found', 404)

  if (file.accessType !== AccessType.PROTECTED) {
    throw new AppError('This file is not password protected', 400)
  }

  const isValid = await bcrypt.compare(password, file.password)
  if (!isValid) throw new AppError('Invalid password', 401)

  // Decrypt storageKey with user password so token carries it for preview/download
  const decryptedStorageKey = decryptStorageKey(file.storageKey, password, file.salt)
  const accessToken = signAccessToken(token, decryptedStorageKey)

  return { accessToken }
}

const getFilePreview = async (token: string, accessToken?: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })
  if (!file) throw new AppError('File not found', 404)

  if (!PREVIEWABLE_TYPES.has(file.fileType)) {
    throw new AppError('Preview not supported for this file type', 400)
  }

  let storageKey: string

  if (file.accessType === AccessType.PROTECTED) {
    if (!accessToken) throw new AppError('Access token required', 401)
    const payload = verifyAccessToken(accessToken)
    if (payload.shareToken !== token) throw new AppError('Token mismatch', 401)
    storageKey = payload.storageKey
  } else {
    // Public: decrypt via master key
    storageKey = decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)
  }

  const fileUrl = `https://utfs.io/f/${storageKey}`

  switch (file.fileType) {
    case FileType.PDF:
      return { kind: 'pdf' as const, url: fileUrl }

    case FileType.TXT: {
      const response = await fetch(fileUrl)
      if (!response.ok) throw new AppError('Failed to fetch file content', 502)
      const text = await response.text()
      return { kind: 'text' as const, text }
    }

    case FileType.DOCX:
      return { kind: 'docx_url' as const, url: fileUrl }

    case FileType.ZIP:
      return { kind: 'zip_url' as const, url: fileUrl }

    default:
      throw new AppError('Preview not supported for this file type', 400)
  }
}

const getFileDownloadUrl = async (token: string, accessToken?: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })
  if (!file) throw new AppError('File not found', 404)

  let storageKey: string

  if (file.accessType === AccessType.PROTECTED) {
    if (!accessToken) throw new AppError('Access token required', 401)
    const payload = verifyAccessToken(accessToken)
    if (payload.shareToken !== token) throw new AppError('Token mismatch', 401)
    storageKey = payload.storageKey
  } else {
    storageKey = decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)
  }

  // Increment downloadCount
  await fileRepository.increment({ shareToken: token }, 'downloadCount', 1)

  return { fileUrl: `https://utfs.io/f/${storageKey}` }
}

const deleteFileByShareToken = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })
  if (!file) throw new AppError('File not found', 404)

  const storageKey = decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)

  await deleteStorageFiles([storageKey])

  await fileRepository.remove(file)
}

export const deleteExpiredFiles = async () => {
  const fileRepository = useTypeORM(FileEntity)

  const expiredFiles = await fileRepository.createQueryBuilder('file').where('file.expireAt <= :now', { now: new Date() }).getMany()

  if (!expiredFiles.length) {
    console.warn('No expired files')
    return { deleted: 0 }
  }

  const storageKeys = expiredFiles.map((f) => decryptStorageKey(f.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))
  await deleteStorageFiles(storageKeys)

  await fileRepository.remove(expiredFiles)

  return { deleted: expiredFiles.length }
}

const getFilesByOwner = async (ownerId: string, search?: string) => {
  const where: FindOptionsWhere<FileEntity> = { ownerId }
  const term = search?.trim()
  if (term) where.fileName = ILike(`%${term}%`)

  return useTypeORM(FileEntity).find({ where, relations: { folder: true }, order: { createdAt: 'DESC' } })
}

export { deleteFileById, deleteFileByShareToken, getFileByToken, getFileDownloadUrl, getFilePreview, getFilesByOwner, uploadFileService, verifyFilePassword }

