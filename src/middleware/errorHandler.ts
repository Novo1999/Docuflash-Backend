import { AppError } from '../errors/AppError'
import createErrorResponse from '../utils/createErrorResponse'
import { NextFunction, Request, Response } from 'express'

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof AppError) {
    return createErrorResponse(res, {
      msg: error.message,
      status: error.statusCode,
      error,
    })
  }

  if (error.name === 'QueryFailedError') {
    return createErrorResponse(res, {
      msg: 'Database query failed',
      status: 400,
      error,
    })
  }

  return createErrorResponse(res, {
    msg: 'Internal server error',
    status: 500,
    error,
  })
}
