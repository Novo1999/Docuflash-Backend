import { getFileById } from '@/services/file.service'
import createJsonResponse from '@/utils/createJsonResponse'
import { NextFunction, Request, Response } from 'express'

export const getFile = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
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
