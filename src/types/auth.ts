export type AuthUser = {
  id: string
  email: string
  provider?: string
  defaultExpiry?: string
  defaultPrivacy?: 'public' | 'protected'
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

export type GoogleNativePayload = {
  idToken: string
  // Optional nonce — only needed if you request one from the native picker.
  nonce?: string
}

export type ForgotPasswordPayload = {
  email: string
  redirectTo?: string
}

export type ResetPasswordPayload = {
  accessToken: string
  refreshToken: string
  password: string
}

export type UpdateProfilePayload = {
  avatarUrl?: string
  displayName?: string
  defaultExpiry?: string
  defaultPrivacy?: 'public' | 'protected'
}
