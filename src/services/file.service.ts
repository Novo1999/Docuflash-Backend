import bcrypt from 'bcryptjs'
import { DeepPartial } from 'typeorm'
import { UTApi } from 'uploadthing/server'
import { PREVIEWABLE_TYPES } from '../constants'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { FolderEntity } from '../entity/folder.entity'
import { AppError } from '../errors/AppError'
import { FileAccessType, FileType } from '../types/file'
import { signAccessToken, verifyAccessToken } from '../utils/accessToken'
import { decryptStorageKey } from '../utils/fileProtection'

const getFileByToken = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)
  const fileByToken = await fileRepository.findOneBy({ shareToken: token })
  if (!fileByToken) throw new AppError('File not found', 404)
  return fileByToken
}

const deleteFileById = async (id: string) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  const file = await fileRepository.findOneBy({ id })
  if (!file) throw new AppError('File not found', 404)

  const storageKey = decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)

  const utapi = new UTApi()
  await utapi.deleteFiles([storageKey])

  await fileRepository.remove(file)
}
const uploadFileService = async (payload: DeepPartial<FileEntity>) => {
  const fileRepository = useTypeORM(FileEntity)
  const file = fileRepository.create(payload)
  return fileRepository.save(file)
}

const verifyFilePassword = async (token: string, password: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })
  if (!file) throw new AppError('File not found', 404)

  if (file.accessType !== FileAccessType.PROTECTED) {
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

  if (file.accessType === FileAccessType.PROTECTED) {
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

    default:
      throw new AppError('Preview not supported for this file type', 400)
  }
}

const getFileDownloadUrl = async (token: string, accessToken?: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })
  if (!file) throw new AppError('File not found', 404)

  let storageKey: string

  if (file.accessType === FileAccessType.PROTECTED) {
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

  const utapi = new UTApi()
  await utapi.deleteFiles([storageKey])

  await fileRepository.remove(file)
}

export const deleteExpiredFiles = async () => {
  const fileRepository = useTypeORM(FileEntity)

  const expiredFiles = await fileRepository.createQueryBuilder('file').where('file.expireAt <= :now', { now: new Date() }).getMany()
  console.log("🚀 ~ deleteExpiredFiles ~ expiredFiles:", expiredFiles)

  if (!expiredFiles.length) {
    console.warn('No expired files')
    return { deleted: 0 }
  }

  const utapi = new UTApi()
  const storageKeys = expiredFiles.map((f) => decryptStorageKey(f.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))
  console.log("🚀 ~ deleteExpiredFiles ~ storageKeys:", storageKeys)
  await utapi.deleteFiles(storageKeys)

  await fileRepository.remove(expiredFiles)

  return { deleted: expiredFiles.length }
}

export { deleteFileById, deleteFileByShareToken, getFileByToken, getFileDownloadUrl, getFilePreview, uploadFileService, verifyFilePassword }
