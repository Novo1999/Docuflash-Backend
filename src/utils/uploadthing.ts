import { createUploadthing, type FileRouter } from 'uploadthing/express'

const f = createUploadthing()
const config = { maxFileSize: '16MB' as const, maxFileCount: 5 }
const avatarConfig = { maxFileSize: '1MB' as const, maxFileCount: 1 }

export const uploadRouter = {
  fileUploader: f({
    pdf: config,
    'application/msword': config,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': config, // 👈 .docx
    'application/vnd.ms-excel': config,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': config, // 👈 .xlsx
    'application/zip': config,
    'application/x-zip-compressed': config, // 👈 .zip on Windows Chrome/Edge
    'application/x-zip': config, // 👈 older browser label for .zip
    text: config,
  } as Parameters<typeof f>[0]).onUploadComplete((data) => {
    console.log('upload completed', data)
  }),
  avatarUploader: f({ image: avatarConfig }).onUploadComplete((data) => {
    console.log('avatar upload completed', data)
  }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter
