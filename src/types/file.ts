export enum FileType {
  PDF = 'pdf',
  XLS = 'xls',
  TXT = 'txt',
  ZIP = 'zip',
  DOCX = 'docx',
  OTHER = 'other',
}

export type DeviceInfo = {
  deviceType: 'mobile' | 'desktop'
  browser: string
  os: string
}
