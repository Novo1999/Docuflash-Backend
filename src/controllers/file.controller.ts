import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { DeepPartial } from 'typeorm'
import { FileEntity } from '../entity/file.entity'
import { AppError } from '../errors/AppError'
import { deleteExpiredFiles, deleteFileById, deleteFileByShareToken, getFileByToken, getFileDownloadUrl, getFilePreview, getFilesByOwner, uploadFileService, verifyFilePassword } from '../services/file.service'
import { deleteExpiredRequestFolders } from '../services/folder.service'
import { TypedBodyRequest } from '../types/common'
import createJsonResponse from '../utils/createJsonResponse'

const getFileByShareToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const file = await getFileByToken(token)
    const { password, storageKey, id, deviceInfo, clientId, folder, ...rest } = file
    const folders = (folder ?? []).map(({ id, folderName }) => ({ id, folderName }))
    return createJsonResponse(res, {
      msg: 'File fetched successfully',
      data: { ...rest, folders, uploadDate: rest.createdAt },
      status: 200,
    })
  } catch (error) {
    next(error)
  }
}

const getMyFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)

    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const files = await getFilesByOwner(req.user.id, search)

    const data = files.map((file) => {
      const { password, storageKey, masterEncryptedStorageKey, deviceInfo, clientId, salt, folder, ...rest } = file
      const folders = (folder ?? []).map(({ id, folderName }) => ({ id, folderName }))
      return { ...rest, folders }
    })

    return createJsonResponse(res, { msg: 'Files fetched', data, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const deleteFile = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await deleteFileById(id)
    return createJsonResponse(res, { msg: 'File deleted successfully', data: null, status: 200 })
  } catch (error) {
    next(error)
  }
}

const uploadFile = async (req: TypedBodyRequest<DeepPartial<FileEntity>>, res: Response, next: NextFunction) => {
  try {
    const body = req.body

    if (body.accessType === 'protected' && !body.password) {
      throw new AppError('You must set a password', StatusCodes.BAD_REQUEST)
    }

    const fileResponse = await uploadFileService({ ...body, ownerId: req.user?.id ?? null })

    const { password, storageKey, deviceInfo, clientId, downloadCount, ...rest } = fileResponse
    return createJsonResponse(res, { msg: 'File uploaded', data: rest, status: 200 })
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

    return createJsonResponse(res, { msg: 'Password verified', data: result, status: 200 })
  } catch (error) {
    next(error)
  }
}

const previewFile = async (req: Request<{ token: string }, {}, { accessToken?: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { accessToken } = req.body

    const result = await getFilePreview(token, accessToken)

    return createJsonResponse(res, { msg: 'Preview fetched', data: result, status: 200 })
  } catch (error) {
    next(error)
  }
}

const downloadFile = async (req: Request<{ token: string }, {}, { accessToken?: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { accessToken } = req.body

    const result = await getFileDownloadUrl(token, accessToken)

    return createJsonResponse(res, { msg: 'Download URL fetched', data: result, status: 200 })
  } catch (error) {
    next(error)
  }
}

const deleteFileByShareTokenController = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    await deleteFileByShareToken(token)

    return createJsonResponse(res, { msg: 'File deleted successfully', data: null, status: 200 })
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
    const filesResult = await deleteExpiredFiles()
    const foldersResult = await deleteExpiredRequestFolders()
    const result = { files: filesResult.deleted, requestFolders: foldersResult.deleted }
    console.log('CLEANUP', result)
    return createJsonResponse(res, { msg: 'Cleanup complete', data: result, status: 200 })
  } catch (error) {
    next(error)
  }
}

export { cleanupExpiredFiles, deleteFile, deleteFileByShareTokenController as deleteFileByShareToken, downloadFile, getFileByShareToken, getMyFiles, previewFile, uploadFile, verifyPassword }

