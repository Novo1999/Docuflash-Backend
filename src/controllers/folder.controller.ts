import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../errors/AppError'
import { addFilesToRequestService, createFolderService, createUploadRequestService, deleteFolderByIdService, deleteFolderByTokenService, getFolderByIdService, getFolderByTokenService, getFoldersByOwner, unlockFolderService } from '../services/folder.service'
import { TypedBodyRequest } from '../types/common'
import { FolderPayload, RequestFilePayload, UploadRequestPayload } from '../types/folder'
import createJsonResponse from '../utils/createJsonResponse'

const createFolder = async (req: TypedBodyRequest<FolderPayload>, res: Response, next: NextFunction) => {
  try {
    const shareToken = crypto.randomBytes(16).toString('hex')
    const folderResponse = await createFolderService({ ...req.body, shareToken, ownerId: req.user?.id ?? null })

    return createJsonResponse(res, { msg: 'Folder uploaded', data: folderResponse, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const createUploadRequest = async (req: TypedBodyRequest<UploadRequestPayload>, res: Response, next: NextFunction) => {
  try {
    const shareToken = crypto.randomBytes(16).toString('hex')
    const folder = await createUploadRequestService({
      folderName: req.body.folderName,
      clientId: req.body.clientId,
      shareToken,
      ownerId: req.user?.id ?? null,
    })

    return createJsonResponse(res, {
      msg: 'Upload request created',
      data: { shareToken: folder.shareToken, folderName: folder.folderName, acceptsUploads: folder.acceptsUploads, expireAt: folder.expireAt },
      status: StatusCodes.OK,
    })
  } catch (error) {
    next(error)
  }
}

const attachFilesToRequest = async (req: Request<{ token: string }, unknown, { files: RequestFilePayload[] }>, res: Response, next: NextFunction) => {
  try {
    const savedFiles = await addFilesToRequestService(req.params.token, req.body.files)

    const safeFiles = savedFiles.map((file) => {
      const { password, storageKey, deviceInfo, clientId, masterEncryptedStorageKey, salt, ...fileRest } = file
      return fileRest
    })

    return createJsonResponse(res, { msg: 'Files uploaded', data: safeFiles, status: StatusCodes.OK })
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

const getMyFolders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)
    }

    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const folders = await getFoldersByOwner(req.user.id, search)

    const safeFolders = folders.map((folder) => {
      const { password, ...rest } = folder
      return rest
    })

    return createJsonResponse(res, { msg: 'Folders fetched', data: safeFolders, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

export { attachFilesToRequest, createFolder, createUploadRequest, deleteFolderById, deleteFolderByShareToken, getFolderById, getFolderByShareToken, getMyFolders, unlockFolder }

