import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '../errors/AppError'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const assertConfigured = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AppError('Supabase is not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)', 500)
  }
}

const getSupabaseAuthClient = (): SupabaseClient => {
  assertConfigured()
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

const getSupabaseAdminClient = (): SupabaseClient => {
  assertConfigured()
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError('Supabase admin is not configured (set SUPABASE_SERVICE_ROLE_KEY)', 500)
  }
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

class MemoryStorage {
  private store = new Map<string, string>()

  constructor(seed?: Record<string, string>) {
    if (seed) for (const [key, value] of Object.entries(seed)) this.store.set(key, value)
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  entries(): Record<string, string> {
    return Object.fromEntries(this.store)
  }
}

const getSupabaseOAuthClient = (storage: MemoryStorage): SupabaseClient => {
  assertConfigured()
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storage: storage as unknown as Storage,
      storageKey: 'docuflash-oauth',
    },
  })
}

export { getSupabaseAdminClient, getSupabaseAuthClient, getSupabaseOAuthClient, MemoryStorage }
