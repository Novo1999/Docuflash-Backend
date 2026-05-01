import { FileEntity } from '@/entity/file.entity'
import { AppError } from '@/errors/AppError'
import { deleteFileById, getFileByToken, uploadFileService } from '@/services/file.service'
import { TypedBodyRequest } from '@/types/common'
import createJsonResponse from '@/utils/createJsonResponse'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { DeepPartial } from 'typeorm'

const getFileByShareToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const file = await getFileByToken(token)

    const { password, storageKey, id, deviceInfo, clientId, downloadCount, ...rest } = file

    return createJsonResponse(res, {
      msg: 'File fetched successfully',
      data: rest,
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

export { deleteFile, getFileByShareToken, uploadFile }
