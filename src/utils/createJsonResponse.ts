import { Response } from 'express'

type JsonResponseType<T> = {
  msg: string
  data?: T
  status: number
}

const createJsonResponse = <T>(res: Response, arg: JsonResponseType<T>) => {
  return res.status(arg.status).json({
    success: true,
    msg: arg.msg,
    data: arg.data,
    status: arg.status,
  })
}
export default createJsonResponse
