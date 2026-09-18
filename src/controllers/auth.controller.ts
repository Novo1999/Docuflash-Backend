import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../errors/AppError'
import { deleteAccount, getCurrentUser, getOAuthUrl, handleOAuthCallback, loginUser, loginWithGoogleIdToken, logoutUser, refreshSession, registerUser, requestPasswordReset, requestVerifiedAccountDeletion, resetPassword as resetPasswordService, updateProfile } from '../services/auth.service'
import { AccountDeletionRequestPayload, ForgotPasswordPayload, GoogleNativePayload, LoginPayload, OAuthProvider, RefreshPayload, RegisterPayload, ResetPasswordPayload, UpdateProfilePayload } from '../types/auth'
import { TypedBodyRequest } from '../types/common'
import createJsonResponse from '../utils/createJsonResponse'

const OAUTH_STATE_COOKIE = 'df_oauth_state'
const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'github']
const MOBILE_REDIRECT_SCHEME = 'docuflashmobile://'

type OAuthStateCookie = {
  storage: Record<string, string>
  redirect?: string
}

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000'
const getBackendUrl = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
const getAccountDeletionRedirectUrl = () => new URL('/delete-account/confirm', getFrontendUrl()).toString()

const register = async (req: TypedBodyRequest<RegisterPayload>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new AppError('Email and password are required', StatusCodes.BAD_REQUEST)

    const result = await registerUser(req.body)
    return createJsonResponse(res, { msg: 'Registration successful', data: result, status: StatusCodes.CREATED })
  } catch (error) {
    next(error)
  }
}

const login = async (req: TypedBodyRequest<LoginPayload>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new AppError('Email and password are required', StatusCodes.BAD_REQUEST)

    const result = await loginUser(req.body)
    return createJsonResponse(res, { msg: 'Login successful', data: result, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const googleNative = async (req: TypedBodyRequest<GoogleNativePayload>, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body
    if (!idToken) throw new AppError('idToken is required', StatusCodes.BAD_REQUEST)

    const result = await loginWithGoogleIdToken(req.body)
    return createJsonResponse(res, { msg: 'Login successful', data: result, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const forgotPassword = async (req: TypedBodyRequest<ForgotPasswordPayload>, res: Response, next: NextFunction) => {
  try {
    const { email, redirectTo } = req.body
    if (!email) throw new AppError('Email is required', StatusCodes.BAD_REQUEST)

    if (redirectTo && !redirectTo.startsWith(MOBILE_REDIRECT_SCHEME) && !redirectTo.startsWith(getFrontendUrl())) {
      throw new AppError('Invalid redirect target', StatusCodes.BAD_REQUEST)
    }

    await requestPasswordReset(email, redirectTo ?? `${getFrontendUrl()}/auth/reset-password`)
    return createJsonResponse(res, {
      msg: 'If an account exists for that email, a password reset link is on its way',
      data: null,
      status: StatusCodes.OK,
    })
  } catch (error) {
    next(error)
  }
}

const requestAccountDeletion = async (req: TypedBodyRequest<AccountDeletionRequestPayload>, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    if (!email || typeof email !== 'string') throw new AppError('Email is required', StatusCodes.BAD_REQUEST)

    await requestVerifiedAccountDeletion(email, getAccountDeletionRedirectUrl())
    return createJsonResponse(res, {
      msg: 'If an account exists for that email, a verification link is on its way.',
      data: null,
      status: StatusCodes.OK,
    })
  } catch (error) {
    next(error)
  }
}

const resetPassword = async (req: TypedBodyRequest<ResetPasswordPayload>, res: Response, next: NextFunction) => {
  try {
    const { accessToken, refreshToken, password } = req.body
    if (!accessToken || !refreshToken) throw new AppError('Reset link is invalid or has expired', StatusCodes.UNAUTHORIZED)
    if (!password || password.length < 6) throw new AppError('Password must be at least 6 characters', StatusCodes.BAD_REQUEST)

    const result = await resetPasswordService({ accessToken, refreshToken, password })
    return createJsonResponse(res, { msg: 'Password updated', data: result, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const refresh = async (req: TypedBodyRequest<RefreshPayload>, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) throw new AppError('Refresh token is required', StatusCodes.BAD_REQUEST)

    const result = await refreshSession(refreshToken)
    return createJsonResponse(res, { msg: 'Session refreshed', data: result, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null
    if (!token) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)

    await logoutUser(token)
    return createJsonResponse(res, { msg: 'Logged out', data: null, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)

    const user = await getCurrentUser(req.user.id)
    return createJsonResponse(res, { msg: 'User fetched', data: user, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const updateMe = async (req: TypedBodyRequest<UpdateProfilePayload>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)

    const { avatarUrl, displayName, defaultExpiry, defaultPrivacy } = req.body
    if (avatarUrl === undefined && displayName === undefined && defaultExpiry === undefined && defaultPrivacy === undefined) {
      throw new AppError('Nothing to update', StatusCodes.BAD_REQUEST)
    }

    const expiryOptions = ['1h', '6h', '24h', '3d', '7d']
    const privacyOptions = ['public', 'protected']

    if (defaultExpiry !== undefined && !expiryOptions.includes(defaultExpiry)) {
      throw new AppError('Invalid default expiry', StatusCodes.BAD_REQUEST)
    }

    if (defaultPrivacy !== undefined && !privacyOptions.includes(defaultPrivacy)) {
      throw new AppError('Invalid default privacy', StatusCodes.BAD_REQUEST)
    }

    const user = await updateProfile(req.user.id, {
      avatarUrl,
      displayName,
      defaultExpiry,
      defaultPrivacy,
    })
    return createJsonResponse(res, { msg: 'Profile updated', data: user, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const deleteMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)

    const result = await deleteAccount(req.user.id)
    return createJsonResponse(res, { msg: 'Account deleted', data: result, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const oauthRedirect = async (req: Request<{ provider: string }>, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider as OAuthProvider
    if (!OAUTH_PROVIDERS.includes(provider)) {
      throw new AppError('Unsupported OAuth provider', StatusCodes.BAD_REQUEST)
    }

    const requestedRedirect = typeof req.query.redirect === 'string' ? req.query.redirect : undefined
    if (requestedRedirect && !requestedRedirect.startsWith(MOBILE_REDIRECT_SCHEME)) {
      throw new AppError('Invalid redirect target', StatusCodes.BAD_REQUEST)
    }

    const redirectTo = `${getBackendUrl()}/api/auth/callback`
    const { url, storageState } = await getOAuthUrl(provider, redirectTo)

    const stateCookie: OAuthStateCookie = { storage: storageState, redirect: requestedRedirect }
    res.cookie(OAUTH_STATE_COOKIE, JSON.stringify(stateCookie), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    })

    return res.redirect(url)
  } catch (error) {
    next(error)
  }
}

const parseOAuthStateCookie = (raw: string | undefined): OAuthStateCookie | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OAuthStateCookie | Record<string, string>
    if (parsed && typeof parsed === 'object' && 'storage' in parsed) {
      const state = parsed as OAuthStateCookie
      const redirect =
        typeof state.redirect === 'string' && state.redirect.startsWith(MOBILE_REDIRECT_SCHEME) ? state.redirect : undefined
      return { storage: state.storage ?? {}, redirect }
    }
    return { storage: parsed as Record<string, string> }
  } catch {
    return null
  }
}

const oauthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const state = parseOAuthStateCookie(req.cookies?.[OAUTH_STATE_COOKIE])
  const callbackTarget = state?.redirect ?? `${getFrontendUrl()}/auth/callback`
  try {
    const code = req.query.code as string | undefined
    const oauthError = req.query.error_description ?? req.query.error

    if (oauthError) {
      return res.redirect(`${callbackTarget}#error=${encodeURIComponent(String(oauthError))}`)
    }

    if (!code || !state) throw new AppError('Invalid OAuth callback', StatusCodes.BAD_REQUEST)

    const { session } = await handleOAuthCallback(code, state.storage)

    res.clearCookie(OAUTH_STATE_COOKIE)

    const fragment = new URLSearchParams({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_at: String(session.expiresAt ?? ''),
      token_type: session.tokenType,
    }).toString()

    return res.redirect(`${callbackTarget}#${fragment}`)
  } catch (error) {
    next(error)
  }
}

export { deleteMe, forgotPassword, googleNative, login, logout, me, oauthCallback, oauthRedirect, refresh, register, requestAccountDeletion, resetPassword, updateMe }

