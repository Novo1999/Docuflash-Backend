import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../errors/AppError'
import { createFolderService, deleteFolderByIdService, deleteFolderByTokenService, getFolderByIdService, getFolderByTokenService, unlockFolderService } from '../services/folder.service'
import { TypedBodyRequest } from '../types/common'
import { FolderPayload } from '../types/folder'
import createJsonResponse from '../utils/createJsonResponse'

const createFolder = async (req: TypedBodyRequest<FolderPayload>, res: Response, next: NextFunction) => {
  try {
    const shareToken = crypto.randomBytes(16).toString('hex')
    const folderResponse = await createFolderService({ ...req.body, shareToken })

    return createJsonResponse(res, { msg: 'Folder uploaded', data: folderResponse, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const getFolderByShareToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    const folder = await getFolderByTokenService(req.params.token)

    const safeFiles = folder.files.map((file) => {
      const { password, storageKey, deviceInfo, clientId, masterEncryptedStorageKey, ...fileRest } = file
      return fileRest
    })

    return createJsonResponse(res, {
      msg: 'Folder fetched successfully',
      data: { ...folder, files: safeFiles },
      status: StatusCodes.OK,
    })
  } catch (error) {
    next(error)
  }
}

const getFolderById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const folderResponse = await getFolderByIdService(req.params.id)

    return createJsonResponse(res, { msg: 'Folder fetched successfully', data: folderResponse, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const deleteFolderByShareToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
  try {
    await deleteFolderByTokenService(req.params.token)

    return createJsonResponse(res, { msg: 'Folder deleted successfully', data: null, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const deleteFolderById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    await deleteFolderByIdService(req.params.id)

    return createJsonResponse(res, { msg: 'Folder deleted successfully', data: null, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const unlockFolder = async (req: Request<{ password: string, token: string }>, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password) {
      throw new AppError('Password is required', StatusCodes.BAD_REQUEST)
    }

    const folder = await unlockFolderService(token, password)

    const { password: folderPassword, ...rest } = folder
    return createJsonResponse(res, { msg: 'Folder unlocked', data: rest, status: 200 })
  } catch (error) {
    next(error)
  }
}

export { createFolder, deleteFolderById, deleteFolderByShareToken, getFolderById, getFolderByShareToken, unlockFolder }

