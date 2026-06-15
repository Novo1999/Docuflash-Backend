import { UTApi } from 'uploadthing/server'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../errors/AppError'

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Deletes objects from UploadThing storage, retrying transient transport
 * failures. If storage is still unreachable after all attempts, throws an
 * AppError so callers (and the client) get a clear "try again" message instead
 * of a raw 500 — and, importantly, the caller can abort before removing DB rows,
 * keeping metadata and storage consistent (no orphaned objects).
 */
export const deleteStorageFiles = async (storageKeys: string[]) => {
  if (storageKeys.length === 0) return

  const utapi = new UTApi()
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await utapi.deleteFiles(storageKeys)
      return
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS * attempt)
    }
  }

  console.error('Failed to delete files from UploadThing after retries', lastError)
  throw new AppError('Storage provider is unreachable. Please try again in a moment.', StatusCodes.SERVICE_UNAVAILABLE)
}

/**
 * Extracts the UploadThing file key from a stored file URL.
 * Returns null for non-UploadThing URLs (e.g. Google/GitHub OAuth avatars),
 * so callers never attempt to delete keys that don't belong to UploadThing.
 *
 * Handles both URL shapes:
 *   - https://utfs.io/f/<fileKey>
 *   - https://<appId>.ufs.sh/f/<fileKey>
 */
export const extractUploadThingKey = (url: string): string | null => {
  try {
    const { hostname, pathname } = new URL(url)
    const isUploadThing = hostname === 'utfs.io' || hostname === 'ufs.sh' || hostname.endsWith('.ufs.sh')
    if (!isUploadThing) return null

    const match = pathname.match(/\/f\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
