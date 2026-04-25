import { createUploadthing, type FileRouter } from 'uploadthing/express'

const f = createUploadthing()

const config = { maxFileSize: '16MB' as const }

export const uploadRouter = {
  fileUploader: f({
    pdf: config,
    'application/vnd.ms-excel': config,
    'application/msword': config,
    'application/zip': config,
    'application/docbook+xml': config,
    text: config,
  }).onUploadComplete((data) => {
    console.log('upload completed', data)
  }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter
