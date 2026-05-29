import { AccessType } from "./common"

export type FolderPayload = {
  folderName: string
  fileIds: string[]
  shareToken: string
  expireAt: string
  password: string
  accessType: AccessType
  clientId: string
}
