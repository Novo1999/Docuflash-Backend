import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { createFolderService, deleteFolderByIdService, getFolderByIdService } from '../services/folder.service'
import { TypedBodyRequest } from '../types/common'
import { FolderPayload } from '../types/folder'
import createJsonResponse from '../utils/createJsonResponse'

const createFolder = async (req: TypedBodyRequest<FolderPayload>, res: Response, next: NextFunction) => {
  try {
    const folderResponse = await createFolderService({ fileIds: req.body.fileIds, folderName: req.body.folderName })

    return createJsonResponse(res, { msg: 'Folder uploaded', data: folderResponse, status: StatusCodes.OK })
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

const deleteFolderById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    await deleteFolderByIdService(req.params.id)

    return createJsonResponse(res, { msg: 'Folder deleted successfully', data: null, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

export { createFolder, deleteFolderById, getFolderById }
