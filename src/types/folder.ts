import { DeviceInfo, FileType } from "./file"
import { AccessType } from "./common"

export type FolderPayload = {
  folderName: string
  fileIds: string[]
  shareToken: string
  expireAt: string
  password: string
  accessType: AccessType
  clientId: string
  ownerId?: string | null
}

export type UploadRequestPayload = {
  folderName?: string
  clientId?: string
}

export type RequestFilePayload = {
  fileName: string
  fileType: FileType
  fileSize: number
  storageKey: string
  clientId: string
  deviceInfo: DeviceInfo
}
