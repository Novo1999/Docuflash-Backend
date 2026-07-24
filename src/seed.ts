import crypto from 'crypto'
import { UTApi, UTFile } from 'uploadthing/server'
import { AppDataSource, useTypeORM } from './data-source'
import { FileEntity } from './entity/file.entity'
import { FolderEntity } from './entity/folder.entity'
import { loginUser } from './services/auth.service'
import { uploadFileService } from './services/file.service'
import { createFolderService } from './services/folder.service'
import { AccessType } from './types/common'
import { DeviceInfo, FileType } from './types/file'
import { decryptStorageKey } from './utils/fileProtection'
import { deleteStorageFiles } from './utils/storage'

const SEED_CLIENT_ID = 'df-seed-script'
const DAY_MS = 24 * 60 * 60 * 1000

const deviceInfo: DeviceInfo = { deviceType: 'desktop', browser: 'SeedScript', os: 'Windows' }

const expiry = (days: number) => new Date(Date.now() + days * DAY_MS)

const makeTxt = (lines: string[]) => Buffer.from(lines.join('\n') + '\n', 'utf8')

const escapePdfText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const makePdf = (title: string, lines: string[]): Buffer => {
  const contentOps = [
    'BT',
    '/F1 16 Tf',
    '72 720 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, '0 -16 Td']),
    'ET',
  ].join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(contentOps)} >>\nstream\n${contentOps}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}

const crc32 = (data: Buffer): number => {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

const makeZip = (entries: { name: string; data: Buffer }[]): Buffer => {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    locals.push(local, nameBuf, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)

    offset += 30 + nameBuf.length + data.length
  }

  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)

  return Buffer.concat([...locals, centralBuf, eocd])
}

type SeedFileSpec = {
  fileName: string
  fileType: FileType
  data: Buffer
  accessType: AccessType
  password?: string
  expireInDays: number
  folderName?: string
}

const buildSeedFiles = (): SeedFileSpec[] => {
  const revenuePdf = makePdf('Q2 2026 Revenue Summary', [
    'Docuflash Inc. — Quarterly revenue report',
    'Total revenue: $482,300 (up 18% QoQ)',
    'Subscriptions: $391,200 | One-time: $91,100',
    'Top region: EMEA ($204,500)',
    'Prepared by Finance, July 2026',
  ])

  const expensesTxt = makeTxt([
    'Q2 2026 Expense Breakdown',
    '=========================',
    'Payroll .............. $210,400',
    'Infrastructure ....... $48,900',
    'Marketing ............ $36,750',
    'Office & travel ...... $19,200',
    'Total ................ $315,250',
  ])

  const invoiceZip = makeZip([
    { name: 'invoice-2026-041.txt', data: makeTxt(['Invoice #2026-041', 'Client: Acme Corp', 'Amount: $12,400', 'Status: Paid']) },
    { name: 'invoice-2026-042.txt', data: makeTxt(['Invoice #2026-042', 'Client: Northwind Ltd', 'Amount: $8,150', 'Status: Paid']) },
    { name: 'invoice-2026-043.txt', data: makeTxt(['Invoice #2026-043', 'Client: Globex GmbH', 'Amount: $22,900', 'Status: Pending']) },
  ])

  const welcomePdf = makePdf('Welcome to Docuflash, Acme Corp!', [
    'Your onboarding checklist:',
    '1. Create your team workspace',
    '2. Upload your first shared document',
    '3. Set default link expiry in Settings',
    '4. Invite teammates from the dashboard',
    'Questions? support@docuflash.example',
  ])

  const agreementTxt = makeTxt([
    'SERVICE AGREEMENT (DRAFT v2)',
    'Between: Docuflash Inc. and Acme Corp',
    'Term: 12 months starting 2026-08-01',
    'Seats: 25 | Plan: Business',
    'Renewal: automatic unless cancelled 30 days prior',
    'Status: awaiting legal review',
  ])

  const brandPdf = makePdf('Brand Guidelines v3', [
    'Logo: minimum clear space 24px, never stretch',
    'Primary palette: Ink #0F1C2E, Brand Sand #F5F0E8',
    'Typography: Source Serif 4 (headings), DM Sans (body)',
    'Voice: clear, warm, no jargon',
    'Updated July 2026 by the design team',
  ])

  const socialTxt = makeTxt([
    'July Social Media Copy',
    '----------------------',
    'Post 1: Files that vanish on your schedule. Share smarter with Docuflash.',
    'Post 2: Password-protect any link in one tap.',
    'Post 3: New: upload to me — get files from anyone, no account needed.',
    'CTA: docuflash-frontend.vercel.app',
  ])

  const campaignZip = makeZip([
    { name: 'launch-checklist.txt', data: makeTxt(['Launch checklist', '- Press kit sent', '- Landing page live', '- Emails scheduled']) },
    { name: 'ad-copy-variants.txt', data: makeTxt(['Variant A: Share files that self-destruct.', 'Variant B: Your files, your timeline.']) },
  ])

  const meetingTxt = makeTxt([
    'Team Sync — 15 July 2026',
    'Attendees: Nov, Priya, Marcus',
    'Decisions:',
    '- Ship forgot-password flow this week',
    '- Move file previews to lazy loading',
    'Action items:',
    '- Nov: seed staging with demo data',
    '- Priya: QA pass on mobile deep links',
  ])

  const roadmapPdf = makePdf('Product Roadmap — H2 2026', [
    'Q3: password reset, folder sharing improvements',
    'Q3: mobile offline queue for uploads',
    'Q4: team workspaces and roles',
    'Q4: end-to-end encrypted folders',
    'Stretch: desktop drag-and-drop app',
  ])

  const payrollPdf = makePdf('Confidential — Payroll Review 2026', [
    'Scope: annual compensation review',
    'Headcount: 14 full-time, 3 contractors',
    'Proposed adjustment budget: 6.5%',
    'Effective date: 1 September 2026',
    'Distribution: leadership only',
  ])

  const backupZip = makeZip([
    { name: 'README.txt', data: makeTxt(['Website backup — July 2026', 'Includes landing page copy and config snapshot.']) },
    { name: 'landing-copy.txt', data: makeTxt(['Hero: Share files that disappear on your schedule.', 'Sub: Encrypted, expiring, effortless.']) },
    { name: 'config-snapshot.txt', data: makeTxt(['expiry_default=7d', 'privacy_default=protected', 'max_upload_mb=16']) },
  ])

  return [
    { fileName: 'Q2-2026-Revenue-Summary.pdf', fileType: FileType.PDF, data: revenuePdf, accessType: AccessType.PUBLIC, expireInDays: 7, folderName: 'Q2 2026 Financial Reports' },
    { fileName: 'Quarterly-Expense-Breakdown.txt', fileType: FileType.TXT, data: expensesTxt, accessType: AccessType.PUBLIC, expireInDays: 7, folderName: 'Q2 2026 Financial Reports' },
    { fileName: 'Invoice-Archive-Q2.zip', fileType: FileType.ZIP, data: invoiceZip, accessType: AccessType.PUBLIC, expireInDays: 7, folderName: 'Q2 2026 Financial Reports' },
    { fileName: 'Acme-Welcome-Guide.pdf', fileType: FileType.PDF, data: welcomePdf, accessType: AccessType.PUBLIC, expireInDays: 7, folderName: 'Client Onboarding — Acme Corp' },
    { fileName: 'Acme-Service-Agreement-Draft.txt', fileType: FileType.TXT, data: agreementTxt, accessType: AccessType.PUBLIC, expireInDays: 7, folderName: 'Client Onboarding — Acme Corp' },
    { fileName: 'Brand-Guidelines-v3.pdf', fileType: FileType.PDF, data: brandPdf, accessType: AccessType.PUBLIC, expireInDays: 3, folderName: 'Marketing Launch Kit' },
    { fileName: 'Social-Media-Copy-July.txt', fileType: FileType.TXT, data: socialTxt, accessType: AccessType.PUBLIC, expireInDays: 3, folderName: 'Marketing Launch Kit' },
    { fileName: 'Launch-Campaign-Assets.zip', fileType: FileType.ZIP, data: campaignZip, accessType: AccessType.PUBLIC, expireInDays: 3, folderName: 'Marketing Launch Kit' },
    { fileName: 'Meeting-Notes-2026-07-15.txt', fileType: FileType.TXT, data: meetingTxt, accessType: AccessType.PUBLIC, expireInDays: 1 },
    { fileName: 'Product-Roadmap-H2-2026.pdf', fileType: FileType.PDF, data: roadmapPdf, accessType: AccessType.PUBLIC, expireInDays: 7 },
    { fileName: 'Confidential-Payroll-Review.pdf', fileType: FileType.PDF, data: payrollPdf, accessType: AccessType.PROTECTED, password: 'secret123', expireInDays: 7 },
    { fileName: 'Website-Backup-2026-07.zip', fileType: FileType.ZIP, data: backupZip, accessType: AccessType.PUBLIC, expireInDays: 3 },
  ]
}

const cleanupPreviousSeed = async (utapi: UTApi, ownerId: string, seedFileNames: string[]) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  const previousFiles = await fileRepository.find({ where: { clientId: SEED_CLIENT_ID, ownerId }, relations: { folder: true } })
  const previousFolders = await folderRepository.find({ where: { clientId: SEED_CLIENT_ID, ownerId } })

  const referencedKeys = previousFiles.map((file) =>
    decryptStorageKey(file.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!),
  )

  const seedNames = new Set(seedFileNames)
  const listed = await utapi.listFiles()
  const orphanKeys = listed.files.filter((file) => seedNames.has(file.name) && !referencedKeys.includes(file.key)).map((file) => file.key)

  const keysToDelete = [...referencedKeys, ...orphanKeys]
  if (keysToDelete.length) {
    console.log(`Cleaning up ${previousFiles.length} previous seed records and ${keysToDelete.length} storage files...`)
    try {
      await deleteStorageFiles(keysToDelete)
    } catch (error) {
      console.warn('Could not delete some storage files, continuing:', error)
    }
  }

  if (previousFiles.length) await fileRepository.remove(previousFiles)
  if (previousFolders.length) await folderRepository.remove(previousFolders)
}

const uploadWithRetry = async (utapi: UTApi, spec: SeedFileSpec) => {
  let lastError = 'unknown error'
  for (let attempt = 1; attempt <= 4; attempt++) {
    const [result] = await utapi.uploadFiles([new UTFile([spec.data], spec.fileName)])
    if (result?.data) return result.data
    lastError = result?.error?.message ?? lastError
    console.warn(`  upload attempt ${attempt} failed for ${spec.fileName}, retrying...`)
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
  }
  throw new Error(`Upload failed for ${spec.fileName}: ${lastError}`)
}

const seed = async () => {
  try {
    const email = process.env.SEED_EMAIL
    const password = process.env.SEED_PASSWORD
    if (!email || !password) {
      throw new Error('Set SEED_EMAIL and SEED_PASSWORD environment variables before running the seed script')
    }

    await AppDataSource.initialize()
    console.log('Seeding database...')

    const { user } = await loginUser({ email, password })
    console.log(`Seeding as ${user.email} (${user.id})`)

    const specs = buildSeedFiles()
    const utapi = new UTApi()

    await cleanupPreviousSeed(utapi, user.id, specs.map((spec) => spec.fileName))

    const savedByFolder = new Map<string, string[]>()

    console.log(`Uploading ${specs.length} files to UploadThing...`)
    for (const spec of specs) {
      const uploadedFile = await uploadWithRetry(utapi, spec)

      const saved = await uploadFileService({
        fileName: spec.fileName,
        fileType: spec.fileType,
        fileSize: spec.data.length,
        storageKey: uploadedFile.key,
        accessType: spec.accessType,
        password: spec.password,
        clientId: SEED_CLIENT_ID,
        deviceInfo,
        ownerId: user.id,
        expireAt: expiry(spec.expireInDays),
        downloadCount: 0,
      })

      console.log(`  file: ${spec.fileName} -> share token ${saved.shareToken}${spec.password ? ` (password: ${spec.password})` : ''}`)

      if (spec.folderName) {
        const ids = savedByFolder.get(spec.folderName) ?? []
        ids.push(saved.id)
        savedByFolder.set(spec.folderName, ids)
      }
    }

    for (const [folderName, fileIds] of savedByFolder) {
      const folder = await createFolderService({
        folderName,
        fileIds,
        shareToken: crypto.randomBytes(16).toString('hex'),
        expireAt: expiry(7).toISOString(),
        password: '',
        accessType: AccessType.PUBLIC,
        clientId: SEED_CLIENT_ID,
        ownerId: user.id,
      })
      console.log(`  folder: ${folderName} (${fileIds.length} files) -> share token ${folder.shareToken}`)
    }

    console.log('Seeding complete!')
    process.exit(0)
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

seed()
