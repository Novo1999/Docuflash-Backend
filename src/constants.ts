import { FileType } from './types/file'

const PREVIEW_TOKEN_SECRET = process.env.MASTER_ENCRYPTION_KEY!
const PREVIEW_TOKEN_EXPIRY = '15m'

const PREVIEWABLE_TYPES = new Set<FileType>([FileType.PDF, FileType.DOCX, FileType.TXT, FileType.ZIP])

export { PREVIEW_TOKEN_EXPIRY, PREVIEW_TOKEN_SECRET, PREVIEWABLE_TYPES }
