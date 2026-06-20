import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../errors/AppError'
import { getCurrentUser, getOAuthUrl, handleOAuthCallback, loginUser, loginWithGoogleIdToken, logoutUser, refreshSession, registerUser, updateProfile } from '../services/auth.service'
import { GoogleNativePayload, LoginPayload, OAuthProvider, RefreshPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth'
import { TypedBodyRequest } from '../types/common'
import createJsonResponse from '../utils/createJsonResponse'

const OAUTH_STATE_COOKIE = 'df_oauth_state'
const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'github']

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000'
const getBackendUrl = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`

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

    const { avatarUrl, displayName } = req.body
    if (avatarUrl === undefined && displayName === undefined) {
      throw new AppError('Nothing to update', StatusCodes.BAD_REQUEST)
    }

    const user = await updateProfile(req.user.id, { avatarUrl, displayName })
    return createJsonResponse(res, { msg: 'Profile updated', data: user, status: StatusCodes.OK })
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

    const redirectTo = `${getBackendUrl()}/api/auth/callback`
    const { url, storageState } = await getOAuthUrl(provider, redirectTo)

    res.cookie(OAUTH_STATE_COOKIE, JSON.stringify(storageState), {
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

const oauthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const frontendUrl = getFrontendUrl()
  try {
    const code = req.query.code as string | undefined
    const oauthError = req.query.error_description ?? req.query.error

    if (oauthError) {
      return res.redirect(`${frontendUrl}/auth/callback#error=${encodeURIComponent(String(oauthError))}`)
    }

    const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE]
    if (!code || !stateCookie) throw new AppError('Invalid OAuth callback', StatusCodes.BAD_REQUEST)

    const storageState = JSON.parse(stateCookie) as Record<string, string>
    const { session } = await handleOAuthCallback(code, storageState)

    res.clearCookie(OAUTH_STATE_COOKIE)

    const fragment = new URLSearchParams({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_at: String(session.expiresAt ?? ''),
      token_type: session.tokenType,
    }).toString()

    return res.redirect(`${frontendUrl}/auth/callback#${fragment}`)
  } catch (error) {
    next(error)
  }
}

export { googleNative, login, logout, me, oauthCallback, oauthRedirect, refresh, register, updateMe }
