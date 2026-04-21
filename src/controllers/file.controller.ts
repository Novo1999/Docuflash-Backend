import { deleteFileById, getFileById } from '@/services/file.service'
import createJsonResponse from '@/utils/createJsonResponse'
import { NextFunction, Request, Response } from 'express'

const getFile = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const file = await getFileById(id)

    return createJsonResponse(res, {
      msg: 'File fetched successfully',
      data: file,
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

const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  // upload the file to uploadthing
  // if error catch it
  // show error if error
  // if success write to db
  // if error catch it
  // handle if the file uploads successfully but the DB write fails (delete that file basically)
}

export { deleteFile, getFile, uploadFile }
