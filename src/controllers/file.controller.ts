import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { DeepPartial } from 'typeorm'
import { UTApi } from 'uploadthing/server'
import { FileEntity } from '../entity/file.entity'
import { AppError } from '../errors/AppError'
import { deleteExpiredFiles, deleteFileById, deleteFileByShareToken, getFileByToken, getFileDownloadUrl, uploadFileService, verifyFilePassword } from '../services/file.service'
import { TypedBodyRequest } from '../types/common'
import createJsonResponse from '../utils/createJsonResponse'
import { decryptStorageKey, encryptStorageKey } from '../utils/fileProtection'

const getFileByShareToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const file = await getFileByToken(token)

    const { password, storageKey, id, deviceInfo, clientId, ...rest } = file

    return createJsonResponse(res, {
      msg: 'File fetched successfully',
      data: { ...rest, uploadDate: rest.createdAt },
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}
const deleteFile = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await deleteFileById(id)

    return createJsonResponse(res, {
      msg: 'File deleted successfully',
      data: null,
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}

const uploadFile = async (req: TypedBodyRequest<DeepPartial<FileEntity>>, res: Response, next: NextFunction) => {
  try {
    const shareToken = crypto.randomBytes(16).toString('hex')
    const body = req.body

    if (body.accessType === 'protected' && !body.password) {
      throw new AppError('You must set a password', StatusCodes.BAD_REQUEST)
    }

    let hashedPassword: string | undefined
    let encryptedStorageKey: string | undefined
    let salt: string | undefined

    if (body.accessType === 'protected' && body.password) {
      salt = bcrypt.genSaltSync(10)
      hashedPassword = bcrypt.hashSync(body.password, salt)
      encryptedStorageKey = encryptStorageKey(body.storageKey!, body.password, salt)
    }

    const masterEncryptedStorageKey = encryptStorageKey(body.storageKey!, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)

    const fileResponse = await uploadFileService({
      ...body,
      downloadCount: body.downloadCount ?? 0,
      password: hashedPassword,
      shareToken,
      storageKey: encryptedStorageKey ?? body.storageKey,
      masterEncryptedStorageKey,
      salt,
    })

    const { password, storageKey, id, deviceInfo, clientId, downloadCount, ...rest } = fileResponse

    return createJsonResponse(res, {
      msg: 'File uploaded',
      data: rest,
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}

const verifyPassword = async (req: Request<{ token: string }, {}, { password: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password) throw new AppError('Password is required', StatusCodes.BAD_REQUEST)

    const result = await verifyFilePassword(token, password)

    return createJsonResponse(res, {
      msg: 'Password verified',
      data: result,
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}
const downloadFile = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const result = await getFileDownloadUrl(token)

    return createJsonResponse(res, {
      msg: 'Download URL fetched',
      data: result,
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}

const deleteFileByShareTokenController = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const file = await getFileByToken(token)

    if (!file) {
      throw new AppError('File not found', StatusCodes.BAD_REQUEST)
    }

    const { masterEncryptedStorageKey } = file
    const utapi = new UTApi()

    const storageKey = decryptStorageKey(masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!)
    await utapi.deleteFiles(storageKey)

    await deleteFileByShareToken(token)

    return createJsonResponse(res, {
      msg: 'File deleted successfully',
      data: null,
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}

const cleanupExpiredFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-cleanup-api-key']
    if (apiKey !== process.env.CLEANUP_API_KEY) {
      throw new AppError('Unauthorized', StatusCodes.UNAUTHORIZED)
    }

    const result = await deleteExpiredFiles()

    console.log('CLEANUP', result)

    return createJsonResponse(res, {
      msg: `Cleanup complete`,
      data: result,
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}

export { cleanupExpiredFiles, deleteFile, deleteFileByShareTokenController as deleteFileByShareToken, downloadFile, getFileByShareToken, uploadFile, verifyPassword }
