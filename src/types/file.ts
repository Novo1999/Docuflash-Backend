export enum FileType {
  PDF = 'pdf',
  XLS = 'xls',
  TXT = 'txt',
  ZIP = 'zip',
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
