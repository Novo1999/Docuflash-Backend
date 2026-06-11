import { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError'
import { verifySupabaseToken } from '../utils/supabaseToken'

const BEARER_WITH_SPACE_LETTER_COUNT = 7

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    return header.slice(BEARER_WITH_SPACE_LETTER_COUNT).trim()
  }
  return null
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req)
    if (!token) throw new AppError('Authentication required', 401)

    req.user = verifySupabaseToken(token)
    next()
  } catch (error) {
    next(error)
  }
}

const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req)
    if (token) {
      req.user = verifySupabaseToken(token)
    }
    next()
  } catch {
    next()
  }
}

export { optionalAuth, requireAuth }
