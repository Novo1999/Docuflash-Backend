import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { FolderEntity } from '../entity/folder.entity'
import { AppError } from '../errors/AppError'
import { addFilesToRequestService, createFolderService, createUploadRequestService, deleteFolderByIdService, deleteFolderByTokenService, getActiveRequestsService, getFolderByIdService, getFolderByTokenService, getFoldersByOwner, getRequestOwnershipByToken, moveFileToFolderService, unlockFolderService } from '../services/folder.service'
import { TypedBodyRequest } from '../types/common'
import { AttachRequestFilesPayload, FolderPayload, UploadRequestPayload } from '../types/folder'
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
      accessType: req.body.accessType,
      password: req.body.password,
      shareToken,
      ownerId: req.user?.id ?? null,
    })

    return createJsonResponse(res, {
      msg: 'Upload request created',
      data: { shareToken: folder.shareToken, folderName: folder.folderName, accessType: folder.accessType, acceptsUploads: folder.acceptsUploads, expireAt: folder.expireAt },
      status: StatusCodes.OK,
    })
  } catch (error) {
    next(error)
  }
}

const attachFilesToRequest = async (req: Request<{ token: string }, unknown, AttachRequestFilesPayload>, res: Response, next: NextFunction) => {
  try {
    const savedFiles = await addFilesToRequestService(req.params.token, req.body.files, req.body.password)

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

    const ownership = await getRequestOwnershipByToken(req.params.token)
    const callerClientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined
    const isRequestOwner = Boolean(
      ownership?.acceptsUploads && ((req.user && ownership.ownerId === req.user.id) || (callerClientId && ownership.clientId === callerClientId)),
    )

    const safeFiles = folder.files.map((file) => {
      const { password, storageKey, deviceInfo, clientId, masterEncryptedStorageKey, ...fileRest } = file
      return isRequestOwner ? { ...fileRest, senderClientId: clientId } : fileRest
    })

    return createJsonResponse(res, {
      msg: 'Folder fetched successfully',
      data: { ...folder, files: safeFiles, ...(isRequestOwner ? { id: ownership!.id, isRequestOwner: true } : {}) },
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

const moveFileToFolder = async (req: Request<{ id: string }, unknown, { fileId: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)
    }

    const { fileId } = req.body
    if (!fileId) {
      throw new AppError('fileId is required', StatusCodes.BAD_REQUEST)
    }

    const folder = await moveFileToFolderService(req.params.id, fileId, req.user.id)

    const safeFiles = folder.files.map((file) => {
      const { password, storageKey, deviceInfo, clientId, masterEncryptedStorageKey, salt, ...fileRest } = file
      return fileRest
    })
    const { password, ...folderRest } = folder

    return createJsonResponse(res, { msg: 'File moved to folder', data: { ...folderRest, files: safeFiles }, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined
    const ownerId = req.user?.id ?? undefined

    const requests = await getActiveRequestsService({ clientId, ownerId })

    const data = requests.map((folder) => ({
      shareToken: folder.shareToken,
      folderName: folder.folderName,
      accessType: folder.accessType,
      acceptsUploads: folder.acceptsUploads,
      expireAt: folder.expireAt,
      createdAt: folder.createdAt,
      fileCount: (folder as FolderEntity & { fileCount?: number }).fileCount ?? 0,
    }))

    return createJsonResponse(res, { msg: 'Active requests fetched', data, status: StatusCodes.OK })
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

export { attachFilesToRequest, createFolder, createUploadRequest, deleteFolderById, deleteFolderByShareToken, getFolderById, getFolderByShareToken, getMyFolders, getMyRequests, moveFileToFolder, unlockFolder }

