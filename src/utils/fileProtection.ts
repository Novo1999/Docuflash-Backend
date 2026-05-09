import crypto from 'crypto'

/**
 * Derives a 32-byte encryption key from a password and salt using PBKDF2.
 * Used as the key for AES-256-GCM encryption/decryption.
 *
 * @param password - Plaintext password (user password or master key)
 * @param salt - Random salt used during key derivation
 */
export const deriveEncryptionKey = (password: string, salt: string) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256')
}

/**
 * Encrypts a UploadThing storageKey using AES-256-GCM.
 *
 * For password-protected files: called with the user's plaintext password + bcrypt salt.
 * For all files: also called with MASTER_ENCRYPTION_KEY + MASTER_SALT to produce
 * a masterEncryptedStorageKey used for server-side deletion (cron, expired file cleanup).
 *
 * Output format: `iv:authTag:encryptedData` (all hex encoded)
 *
 * @param storageKey - Plaintext UploadThing file key
 * @param password - Plaintext password or master key to encrypt with
 * @param salt - Salt used for key derivation
 */
export const encryptStorageKey = (storageKey: string, password: string, salt: string) => {
  const key = deriveEncryptionKey(password, salt)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(storageKey, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Store iv and authTag alongside the encrypted data for decryption
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts an encrypted UploadThing storageKey using AES-256-GCM.
 *
 * For password-protected files: called with the user's plaintext password + file.salt
 * after bcrypt has verified the password. Used in verifyFilePassword.
 *
 * For deletion (cron, expired access, uploader delete): called with
 * MASTER_ENCRYPTION_KEY + MASTER_SALT to decrypt the masterEncryptedStorageKey.
 *
 * @param encryptedData - Encrypted storageKey in `iv:authTag:encryptedData` format
 * @param password - Plaintext password or master key to decrypt with
 * @param salt - Salt used for key derivation (same salt used during encryption)
 */
export const decryptStorageKey = (encryptedData: string, password: string, salt: string) => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  const key = deriveEncryptionKey(password, salt)
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}
