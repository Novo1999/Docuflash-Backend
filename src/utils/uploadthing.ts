import { createUploadthing, type FileRouter } from 'uploadthing/express'

const f = createUploadthing()
const config = { maxFileSize: '16MB' as const }

export const uploadRouter = {
  fileUploader: f({
    pdf: config,
    'application/msword': config,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': config, // 👈 .docx
    'application/vnd.ms-excel': config,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': config,       // 👈 .xlsx
    'application/zip': config,
    text: config,
  }).onUploadComplete((data) => {
    console.log('upload completed', data)
  }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter
