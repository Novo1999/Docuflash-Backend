import { Response } from 'express'

type ErrorResponseType = {
  msg: string
  status: number
  error?: unknown
}

const createErrorResponse = (res: Response, arg: ErrorResponseType) => {
  return res.status(arg.status).json({
    success: false,
    msg: arg.msg,
    status: arg.status,
    error: process.env.NODE_ENV === 'development' ? arg.error : undefined,
  })
}

export default createErrorResponse
