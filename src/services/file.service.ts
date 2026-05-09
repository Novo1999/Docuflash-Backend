import bcrypt from 'bcryptjs'
import { DeepPartial } from 'typeorm'
import { UTApi } from 'uploadthing/server'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { AppError } from '../errors/AppError'
import { FileAccessType } from '../types/file'
import { decryptStorageKey } from '../utils/fileProtection'

const getFileByToken = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const fileByToken = await fileRepository.findOneBy({ shareToken: token })

  if (!fileByToken) throw new AppError('File not found', 404)

  return fileByToken
}

const deleteFileById = async (id: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const result = await fileRepository.delete({ id })

  if (result.affected === 0) throw new AppError('File not found', 404)
}

const uploadFileService = async (payload: DeepPartial<FileEntity>) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = fileRepository.create(payload)

  const savedFile = await fileRepository.save(file)

  return savedFile
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

  const storageKey = decryptStorageKey(file.storageKey, password, file.salt)
  return { fileUrl: `https://utfs.io/f/${storageKey}` }
}

const getFileDownloadUrl = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = await fileRepository.findOneBy({ shareToken: token })

  if (!file) throw new AppError('File not found', 404)

  if (file.accessType === FileAccessType.PROTECTED) {
    throw new AppError('Password required', 401)
  }

  return { fileUrl: `https://utfs.io/f/${file.storageKey}` }
}

const deleteFileByShareToken = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const result = await fileRepository.delete({ shareToken: token })

  if (result.affected === 0) throw new AppError('File not found', 404)
}

export const deleteExpiredFiles = async () => {
  const fileRepository = useTypeORM(FileEntity)

  const expiredFiles = await fileRepository
    .createQueryBuilder('file')
    .where('file.expireAt <= :now', {
      now: new Date(),
    })
    .getMany()

  if (!expiredFiles.length) {
    console.warn('No expired files')
    return { deleted: 0 }
  }

  const utapi = new UTApi()
  const storageKeys = expiredFiles.map((f) => decryptStorageKey(f.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))
  await utapi.deleteFiles(storageKeys)

  const ids = expiredFiles.map((f) => f.id)
  await fileRepository.delete(ids)

  return { deleted: expiredFiles.length }
}

export { deleteFileById, deleteFileByShareToken, getFileByToken, getFileDownloadUrl, uploadFileService, verifyFilePassword }
