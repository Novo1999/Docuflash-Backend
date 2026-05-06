import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { DeepPartial } from 'typeorm'
import { UTApi } from 'uploadthing/server'
import { FileEntity } from '../entity/file.entity'
import { AppError } from '../errors/AppError'
import { deleteFileById, deleteFileByShareToken, getFileByToken, getFileDownloadUrl, uploadFileService, verifyFilePassword } from '../services/file.service'
import { TypedBodyRequest } from '../types/common'
import createJsonResponse from '../utils/createJsonResponse'

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

    if (body.accessType === 'protected' && body.password) {
      const salt = bcrypt.genSaltSync(10)
      hashedPassword = bcrypt.hashSync(body.password, salt)
    }

    const fileResponse = await uploadFileService({
      ...body,
      downloadCount: body.downloadCount ?? 0,
      password: hashedPassword,
      shareToken,
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

    const { storageKey } = file
    const utapi = new UTApi()
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

export { deleteFile, deleteFileByShareTokenController as deleteFileByShareToken, downloadFile, getFileByShareToken, uploadFile, verifyPassword }
