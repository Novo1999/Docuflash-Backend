export enum ReportTargetType {
  FILE = 'file',
  FOLDER = 'folder',
}

export enum ReportReason {
  CSAM = 'csam',
  NON_CONSENSUAL = 'non_consensual',
  ILLEGAL = 'illegal',
  MALWARE = 'malware',
  HARASSMENT = 'harassment',
  INTELLECTUAL_PROPERTY = 'intellectual_property',
  SPAM = 'spam',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  ACTIONED = 'actioned',
  DISMISSED = 'dismissed',
}

export type CreateReportPayload = {
  targetType: ReportTargetType
  shareToken: string
  reason: ReportReason
  details?: string
  reporterEmail?: string
}

export type UpdateReportPayload = {
  status: ReportStatus
  resolutionNote?: string
}

export type BlockSenderPayload = {
  folderId: string
  senderClientId: string
  ownerClientId?: string
}
