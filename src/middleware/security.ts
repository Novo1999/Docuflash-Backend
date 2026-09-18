import { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { StatusCodes } from 'http-status-codes'
import xss from 'xss'

const SANITIZE_SKIP_KEYS = new Set(['password', 'currentPassword', 'newPassword'])

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') return xss(value)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of Object.keys(record)) {
      if (SANITIZE_SKIP_KEYS.has(key)) continue
      record[key] = sanitizeValue(record[key])
    }
    return record
  }
  return value
}

export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body)
  if (req.query) sanitizeValue(req.query)
  if (req.params) sanitizeValue(req.params)
  next()
}

const rateLimitHandler = (req: Request, res: Response) => {
  res.status(StatusCodes.TOO_MANY_REQUESTS).json({
    success: false,
    msg: 'Too many requests, please try again later.',
    status: StatusCodes.TOO_MANY_REQUESTS,
  })
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

export const accountDeletionRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})
