export type AuthUser = {
  id: string
  email: string
  provider?: string
}

export type RegisterPayload = {
  email: string
  password: string
  displayName?: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type RefreshPayload = {
  refreshToken: string
}

export type OAuthProvider = 'google' | 'github'
