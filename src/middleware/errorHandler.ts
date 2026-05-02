import { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError'
import createErrorResponse from '../utils/createErrorResponse'

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    name: error.name,
    message: error.message,
    stack: error.stack,
  })

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
