import { FileType } from './types/file'

const PREVIEW_TOKEN_SECRET = process.env.MASTER_ENCRYPTION_KEY!
const PREVIEW_TOKEN_EXPIRY = '15m'

const PREVIEWABLE_TYPES = new Set<FileType>([FileType.PDF, FileType.DOCX, FileType.TXT, FileType.ZIP])

const CURRENT_TERMS_VERSION = process.env.TERMS_VERSION || '2026-09-18'

const ABUSE_CONTACT_EMAIL = process.env.ABUSE_CONTACT_EMAIL || 'novorony52@gmail.com'

const MODERATION_ADMIN_EMAILS = (process.env.MODERATION_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

export { ABUSE_CONTACT_EMAIL, CURRENT_TERMS_VERSION, MODERATION_ADMIN_EMAILS, PREVIEW_TOKEN_EXPIRY, PREVIEW_TOKEN_SECRET, PREVIEWABLE_TYPES }
