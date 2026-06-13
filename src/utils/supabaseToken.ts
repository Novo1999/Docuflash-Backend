import { AppError } from '../errors/AppError'
import { AuthUser } from '../types/auth'
import { getSupabaseAuthClient } from './supabase'

const verifySupabaseToken = async (token: string): Promise<AuthUser> => {
  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new AppError('Invalid or expired token', 401)
  }

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    provider: data.user.app_metadata?.provider,
  }
}

export { verifySupabaseToken }
