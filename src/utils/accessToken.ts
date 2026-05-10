import jwt from 'jsonwebtoken'
import { PREVIEW_TOKEN_EXPIRY, PREVIEW_TOKEN_SECRET } from '../constants'
import { AppError } from '../errors/AppError'

const signAccessToken = (token: string, storageKey: string): string => {
  return jwt.sign({ shareToken: token, storageKey }, PREVIEW_TOKEN_SECRET, {
    expiresIn: PREVIEW_TOKEN_EXPIRY,
  })
}

const verifyAccessToken = (accessToken: string): { shareToken: string; storageKey: string } => {
  try {
    return jwt.verify(accessToken, PREVIEW_TOKEN_SECRET) as { shareToken: string; storageKey: string }
  } catch {
    throw new AppError('Invalid or expired access token', 401)
  }
}

export { signAccessToken, verifyAccessToken }
