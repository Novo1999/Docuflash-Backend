import jwt from 'jsonwebtoken'
import { AppError } from '../errors/AppError'
import { AuthUser } from '../types/auth'

type SupabaseJwtPayload = {
  sub: string
  email?: string
  app_metadata?: { provider?: string }
}

const verifySupabaseToken = (token: string): AuthUser => {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new AppError('Supabase auth is not configured (set SUPABASE_JWT_SECRET)', 500)
  }

  try {
    const payload = jwt.verify(token, secret, { audience: 'authenticated' }) as SupabaseJwtPayload
    return {
      id: payload.sub,
      email: payload.email ?? '',
      provider: payload.app_metadata?.provider,
    }
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}

export { verifySupabaseToken }
