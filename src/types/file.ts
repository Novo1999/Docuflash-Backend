export enum FileType {
  PDF = 'pdf',
  XLS = 'xls',
  TXT = 'txt',
  ZIP = 'zip',
  DOCX = 'docx',
}

export enum FileAccessType {
  PROTECTED = 'protected',
  PUBLIC = 'public',
}

export type DeviceInfo = {
  deviceType: 'mobile' | 'desktop'
  browser: string
  os: string
}
