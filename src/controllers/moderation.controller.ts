import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { MODERATION_ADMIN_EMAILS } from '../constants'
import { AppError } from '../errors/AppError'
import { blockSenderService, createReportService, listBlockedSendersService, listReportsService, unblockSenderService, updateReportService } from '../services/moderation.service'
import { TypedBodyRequest } from '../types/common'
import { BlockSenderPayload, CreateReportPayload, ReportReason, ReportStatus, ReportTargetType, UpdateReportPayload } from '../types/moderation'
import createJsonResponse from '../utils/createJsonResponse'

const MAX_DETAILS_LENGTH = 2000
const MAX_EMAIL_LENGTH = 254
const MAX_RESOLUTION_NOTE_LENGTH = 2000

const requireAdmin = (req: Request) => {
  const user = req.user
  if (!user) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)

  if (!MODERATION_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new AppError('You do not have access to moderation', StatusCodes.FORBIDDEN)
  }

  return user
}

const isEnumValue = <T extends Record<string, string>>(enumObject: T, value: unknown): value is T[keyof T] => {
  return typeof value === 'string' && Object.values(enumObject).includes(value)
}

const createReport = async (req: TypedBodyRequest<CreateReportPayload>, res: Response, next: NextFunction) => {
  try {
    const { targetType, shareToken, reason, details, reporterEmail } = req.body

    if (!isEnumValue(ReportTargetType, targetType)) {
      throw new AppError('targetType must be file or folder', StatusCodes.BAD_REQUEST)
    }
    if (!shareToken || typeof shareToken !== 'string') {
      throw new AppError('shareToken is required', StatusCodes.BAD_REQUEST)
    }
    if (!isEnumValue(ReportReason, reason)) {
      throw new AppError('reason is not a supported report reason', StatusCodes.BAD_REQUEST)
    }
    if (details !== undefined && typeof details !== 'string') {
      throw new AppError('details must be a string', StatusCodes.BAD_REQUEST)
    }
    if (typeof details === 'string' && details.length > MAX_DETAILS_LENGTH) {
      throw new AppError(`details must be at most ${MAX_DETAILS_LENGTH} characters`, StatusCodes.BAD_REQUEST)
    }
    if (reporterEmail !== undefined && typeof reporterEmail !== 'string') {
      throw new AppError('reporterEmail must be a string', StatusCodes.BAD_REQUEST)
    }
    if (typeof reporterEmail === 'string' && reporterEmail.length > MAX_EMAIL_LENGTH) {
      throw new AppError(`reporterEmail must be at most ${MAX_EMAIL_LENGTH} characters`, StatusCodes.BAD_REQUEST)
    }

    const report = await createReportService({ targetType, shareToken, reason, details, reporterEmail }, req.user?.id ?? null)

    return createJsonResponse(res, {
      msg: 'Report received. Our team reviews every report.',
      data: { id: report.id, status: report.status, createdAt: report.createdAt },
      status: StatusCodes.CREATED,
    })
  } catch (error) {
    next(error)
  }
}

const listReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req)

    const status = req.query.status
    if (status !== undefined && !isEnumValue(ReportStatus, status)) {
      throw new AppError('status is not a supported report status', StatusCodes.BAD_REQUEST)
    }

    const reports = await listReportsService(status)
    return createJsonResponse(res, { msg: 'Reports fetched', data: reports, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const updateReport = async (req: Request<{ id: string }, unknown, UpdateReportPayload>, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req)

    const { status, resolutionNote } = req.body
    if (!isEnumValue(ReportStatus, status)) {
      throw new AppError('status is not a supported report status', StatusCodes.BAD_REQUEST)
    }
    if (resolutionNote !== undefined && typeof resolutionNote !== 'string') {
      throw new AppError('resolutionNote must be a string', StatusCodes.BAD_REQUEST)
    }
    if (typeof resolutionNote === 'string' && resolutionNote.length > MAX_RESOLUTION_NOTE_LENGTH) {
      throw new AppError(`resolutionNote must be at most ${MAX_RESOLUTION_NOTE_LENGTH} characters`, StatusCodes.BAD_REQUEST)
    }

    const report = await updateReportService(req.params.id, { status, resolutionNote })
    return createJsonResponse(res, { msg: 'Report updated', data: report, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const blockSender = async (req: TypedBodyRequest<BlockSenderPayload>, res: Response, next: NextFunction) => {
  try {
    const { folderId, senderClientId, ownerClientId } = req.body

    if (!folderId || typeof folderId !== 'string') {
      throw new AppError('folderId is required', StatusCodes.BAD_REQUEST)
    }
    if (!senderClientId || typeof senderClientId !== 'string') {
      throw new AppError('senderClientId is required', StatusCodes.BAD_REQUEST)
    }
    if (ownerClientId !== undefined && typeof ownerClientId !== 'string') {
      throw new AppError('ownerClientId must be a string', StatusCodes.BAD_REQUEST)
    }
    if (!req.user && !ownerClientId) {
      throw new AppError('Authentication or ownerClientId is required', StatusCodes.UNAUTHORIZED)
    }

    const blocked = await blockSenderService({ folderId, senderClientId, ownerClientId }, req.user?.id ?? null)
    return createJsonResponse(res, { msg: 'Sender blocked', data: blocked, status: StatusCodes.CREATED })
  } catch (error) {
    next(error)
  }
}

const listBlockedSenders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = req.query.folderId
    const ownerClientId = req.query.ownerClientId

    if (typeof folderId !== 'string' || !folderId) {
      throw new AppError('folderId is required', StatusCodes.BAD_REQUEST)
    }
    if (ownerClientId !== undefined && typeof ownerClientId !== 'string') {
      throw new AppError('ownerClientId must be a string', StatusCodes.BAD_REQUEST)
    }
    if (!req.user && !ownerClientId) {
      throw new AppError('Authentication or ownerClientId is required', StatusCodes.UNAUTHORIZED)
    }

    const blocked = await listBlockedSendersService(folderId, req.user?.id ?? null, ownerClientId)
    return createJsonResponse(res, { msg: 'Blocked senders fetched', data: blocked, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const unblockSender = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const ownerClientId = req.query.ownerClientId

    if (ownerClientId !== undefined && typeof ownerClientId !== 'string') {
      throw new AppError('ownerClientId must be a string', StatusCodes.BAD_REQUEST)
    }
    if (!req.user && !ownerClientId) {
      throw new AppError('Authentication or ownerClientId is required', StatusCodes.UNAUTHORIZED)
    }

    await unblockSenderService(req.params.id, req.user?.id ?? null, ownerClientId)
    return createJsonResponse(res, { msg: 'Sender unblocked', data: null, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

export { blockSender, createReport, listBlockedSenders, listReports, unblockSender, updateReport }
