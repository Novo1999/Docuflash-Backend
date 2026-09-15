import { Session, User } from '@supabase/supabase-js'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { FolderEntity } from '../entity/folder.entity'
import { NoteEntity } from '../entity/note.entity'
import { UserEntity } from '../entity/user.entity'
import { AppError } from '../errors/AppError'
import { GoogleNativePayload, LoginPayload, OAuthProvider, RegisterPayload, ResetPasswordPayload, UpdateProfilePayload } from '../types/auth'
import { decryptStorageKey } from '../utils/fileProtection'
import { deleteStorageFiles, extractUploadThingKey } from '../utils/storage'
import { getSupabaseAdminClient, getSupabaseAuthClient, getSupabaseOAuthClient, MemoryStorage } from '../utils/supabase'

const mapSession = (session: Session) => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresAt: session.expires_at,
  expiresIn: session.expires_in,
  tokenType: session.token_type,
})

const syncUser = async (user: User) => {
  const userRepository = useTypeORM(UserEntity)
  const metadata = user.user_metadata ?? {}
  const existing = await userRepository.findOneBy({ id: user.id })

  if (existing) {
    existing.email = user.email ?? metadata.email ?? existing.email
    existing.displayName = metadata.full_name ?? metadata.name ?? existing.displayName
    existing.avatarUrl = metadata.avatar_url ?? metadata.picture ?? existing.avatarUrl
    existing.provider = user.app_metadata?.provider ?? existing.provider
    return userRepository.save(existing)
  }

  const entity = userRepository.create({
    id: user.id,
    email: user.email ?? metadata.email ?? '',
    displayName: metadata.full_name ?? metadata.name ?? metadata.user_name,
    avatarUrl: metadata.avatar_url ?? metadata.picture,
    provider: user.app_metadata?.provider,
    defaultExpiry: '7d',
    defaultPrivacy: 'protected',
  })

  return userRepository.save(entity)
}

const registerUser = async (payload: RegisterPayload) => {
  const supabase = getSupabaseAuthClient()

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: { data: { full_name: payload.displayName } },
  })

  if (error) throw new AppError(error.message, error.status ?? 400)
  if (!data.user) throw new AppError('Registration failed', 400)

  const user = await syncUser(data.user)

  if (!data.session) {
    return { user, session: null, needsEmailConfirmation: true }
  }

  return { user, session: mapSession(data.session), needsEmailConfirmation: false }
}

const loginUser = async (payload: LoginPayload) => {
  const supabase = getSupabaseAuthClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  })

  if (error) throw new AppError(error.message, error.status ?? 401)
  if (!data.session || !data.user) throw new AppError('Invalid credentials', 401)

  const user = await syncUser(data.user)

  return { user, session: mapSession(data.session) }
}

const loginWithGoogleIdToken = async (payload: GoogleNativePayload) => {
  const supabase = getSupabaseAuthClient()

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: payload.idToken,
    nonce: payload.nonce,
  })

  if (error) throw new AppError(error.message, error.status ?? 401)
  if (!data.session || !data.user) throw new AppError('Invalid Google credentials', 401)

  const user = await syncUser(data.user)

  return { user, session: mapSession(data.session) }
}

const refreshSession = async (refreshToken: string) => {
  const supabase = getSupabaseAuthClient()

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

  if (error) throw new AppError(error.message, error.status ?? 401)
  if (!data.session) throw new AppError('Could not refresh session', 401)

  return { session: mapSession(data.session) }
}

const requestPasswordReset = async (email: string, redirectTo: string) => {
  const supabase = getSupabaseAuthClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) throw new AppError(error.message, error.status ?? 400)
}

const resetPassword = async (payload: ResetPasswordPayload) => {
  const supabase = getSupabaseAuthClient()

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  })

  if (sessionError || !sessionData.session || !sessionData.user) {
    throw new AppError('Reset link is invalid or has expired', sessionError?.status ?? 401)
  }

  const { data, error } = await supabase.auth.updateUser({ password: payload.password })

  if (error) throw new AppError(error.message, error.status ?? 400)
  if (!data.user) throw new AppError('Could not update password', 400)

  const user = await syncUser(data.user)

  return { user, session: mapSession(sessionData.session) }
}

const logoutUser = async (accessToken: string) => {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.auth.admin.signOut(accessToken)
  if (error) throw new AppError(error.message, error.status ?? 400)
}

const getOAuthUrl = async (provider: OAuthProvider, redirectTo: string) => {
  const storage = new MemoryStorage()
  const supabase = getSupabaseOAuthClient(storage)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })

  if (error || !data?.url) throw new AppError(error?.message ?? 'Could not start OAuth flow', 400)

  return { url: data.url, storageState: storage.entries() }
}

const handleOAuthCallback = async (code: string, storageState: Record<string, string>) => {
  const storage = new MemoryStorage(storageState)
  const supabase = getSupabaseOAuthClient(storage)

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) throw new AppError(error.message, error.status ?? 400)
  if (!data.session || !data.user) throw new AppError('Could not complete OAuth flow', 400)

  const user = await syncUser(data.user)

  return { user, session: mapSession(data.session) }
}

const getCurrentUser = async (userId: string) => {
  const userRepository = useTypeORM(UserEntity)
  const user = await userRepository.findOneBy({ id: userId })
  if (!user) throw new AppError('User not found', 404)
  return user
}

const updateProfile = async (userId: string, updates: UpdateProfilePayload) => {
  const userRepository = useTypeORM(UserEntity)
  const user = await userRepository.findOneBy({ id: userId })
  if (!user) throw new AppError('User not found', 404)

  const previousAvatarUrl = user.avatarUrl

  if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl
  if (updates.displayName !== undefined) user.displayName = updates.displayName
  if (updates.defaultExpiry !== undefined) user.defaultExpiry = updates.defaultExpiry
  if (updates.defaultPrivacy !== undefined) user.defaultPrivacy = updates.defaultPrivacy

  const saved = await userRepository.save(user)

  // Best-effort cleanup of the replaced avatar. Only deletes genuine
  // UploadThing files (skips OAuth avatar URLs) and never fails the profile
  // update if storage is unreachable — the new avatar is already saved.
  if (updates.avatarUrl !== undefined && previousAvatarUrl && previousAvatarUrl !== updates.avatarUrl) {
    const oldKey = extractUploadThingKey(previousAvatarUrl)
    if (oldKey) {
      try {
        await deleteStorageFiles([oldKey])
      } catch (error) {
        console.error('Failed to delete previous avatar from storage', error)
      }
    }
  }

  return saved
}

const collectStorageKeys = (files: FileEntity[]) => {
  const keys: string[] = []

  for (const file of files) {
    if (!file.masterEncryptedStorageKey) continue
    try {
      keys.push(decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))
    } catch (error) {
      console.error('Skipping undecryptable storage key while deleting account', { fileId: file.id, error })
    }
  }

  return keys
}

const deleteAccount = async (userId: string) => {
  const userRepository = useTypeORM(UserEntity)
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)
  const noteRepository = useTypeORM(NoteEntity)

  const user = await userRepository.findOneBy({ id: userId })
  if (!user) throw new AppError('User not found', 404)

  const folders = await folderRepository.find({ where: { ownerId: userId }, relations: { files: true } })
  const ownedFiles = await fileRepository.find({ where: { ownerId: userId } })

  const filesById = new Map<string, FileEntity>()
  for (const file of ownedFiles) filesById.set(file.id, file)
  for (const folder of folders) {
    for (const file of folder.files ?? []) filesById.set(file.id, file)
  }

  const files = [...filesById.values()]
  const storageKeys = collectStorageKeys(files)

  const avatarKey = user.avatarUrl ? extractUploadThingKey(user.avatarUrl) : null
  if (avatarKey) storageKeys.push(avatarKey)

  await deleteStorageFiles(storageKeys)

  if (files.length) await fileRepository.remove(files)
  if (folders.length) await folderRepository.remove(folders)
  await noteRepository.delete({ ownerId: userId })
  await userRepository.remove(user)

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new AppError(error.message, error.status ?? 500)

  return { filesDeleted: files.length, foldersDeleted: folders.length }
}

export { deleteAccount, getCurrentUser, getOAuthUrl, handleOAuthCallback, loginUser, loginWithGoogleIdToken, logoutUser, refreshSession, registerUser, requestPasswordReset, resetPassword, updateProfile }

