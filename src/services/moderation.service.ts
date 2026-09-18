import { useTypeORM } from '../data-source'
import { BlockedSenderEntity } from '../entity/blocked-sender.entity'
import { FileEntity } from '../entity/file.entity'
import { FolderEntity } from '../entity/folder.entity'
import { ReportEntity } from '../entity/report.entity'
import { AppError } from '../errors/AppError'
import { BlockSenderPayload, CreateReportPayload, ReportStatus, ReportTargetType, UpdateReportPayload } from '../types/moderation'

const resolveReportTargetId = async (targetType: ReportTargetType, shareToken: string) => {
  if (targetType === ReportTargetType.FILE) {
    const file = await useTypeORM(FileEntity).findOne({ where: { shareToken }, select: { id: true } })
    return file?.id ?? null
  }

  const folder = await useTypeORM(FolderEntity).findOne({ where: { shareToken }, select: { id: true } })
  return folder?.id ?? null
}

const createReportService = async (payload: CreateReportPayload, reporterUserId: string | null) => {
  const reportRepository = useTypeORM(ReportEntity)

  const targetId = await resolveReportTargetId(payload.targetType, payload.shareToken)

  const report = reportRepository.create({
    targetType: payload.targetType,
    shareToken: payload.shareToken,
    targetId,
    reason: payload.reason,
    details: payload.details?.trim() || null,
    reporterEmail: payload.reporterEmail?.trim().toLowerCase() || null,
    reporterUserId,
    status: ReportStatus.PENDING,
  })

  return reportRepository.save(report)
}

const listReportsService = async (status?: ReportStatus) => {
  return useTypeORM(ReportEntity).find({
    where: status ? { status } : {},
    order: { createdAt: 'DESC' },
    take: 200,
  })
}

const updateReportService = async (id: string, payload: UpdateReportPayload) => {
  const reportRepository = useTypeORM(ReportEntity)

  const report = await reportRepository.findOne({ where: { id } })
  if (!report) throw new AppError('Report not found', 404)

  report.status = payload.status
  if (payload.resolutionNote !== undefined) report.resolutionNote = payload.resolutionNote?.trim() || null
  report.reviewedAt = new Date()

  return reportRepository.save(report)
}

const getOwnedRequestFolder = async (folderId: string, ownerId: string | null, ownerClientId?: string) => {
  const folder = await useTypeORM(FolderEntity).findOne({ where: { id: folderId } })
  if (!folder) throw new AppError('Upload link not found', 404)

  const ownedByAccount = Boolean(ownerId) && folder.ownerId === ownerId
  const ownedByClient = Boolean(ownerClientId) && folder.clientId === ownerClientId

  if (!ownedByAccount && !ownedByClient) {
    throw new AppError('You do not have access to this upload link', 403)
  }

  return folder
}

const blockSenderService = async (payload: BlockSenderPayload, ownerId: string | null) => {
  const blockedSenderRepository = useTypeORM(BlockedSenderEntity)

  const folder = await getOwnedRequestFolder(payload.folderId, ownerId, payload.ownerClientId)

  const existing = await blockedSenderRepository.findOne({
    where: { folderId: folder.id, senderClientId: payload.senderClientId },
  })
  if (existing) return existing

  const blocked = blockedSenderRepository.create({
    folderId: folder.id,
    senderClientId: payload.senderClientId,
    ownerId: folder.ownerId,
    ownerClientId: folder.clientId ?? null,
  })

  return blockedSenderRepository.save(blocked)
}

const listBlockedSendersService = async (folderId: string, ownerId: string | null, ownerClientId?: string) => {
  const folder = await getOwnedRequestFolder(folderId, ownerId, ownerClientId)

  return useTypeORM(BlockedSenderEntity).find({
    where: { folderId: folder.id },
    order: { createdAt: 'DESC' },
  })
}

const unblockSenderService = async (id: string, ownerId: string | null, ownerClientId?: string) => {
  const blockedSenderRepository = useTypeORM(BlockedSenderEntity)

  const blocked = await blockedSenderRepository.findOne({ where: { id } })
  if (!blocked) throw new AppError('Block not found', 404)

  await getOwnedRequestFolder(blocked.folderId, ownerId, ownerClientId)

  await blockedSenderRepository.remove(blocked)
}

const isSenderBlocked = async (folderId: string, senderClientId?: string) => {
  if (!senderClientId) return false

  const count = await useTypeORM(BlockedSenderEntity).count({ where: { folderId, senderClientId } })
  return count > 0
}

export { blockSenderService, createReportService, isSenderBlocked, listBlockedSendersService, listReportsService, unblockSenderService, updateReportService }
