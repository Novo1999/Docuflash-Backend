import { createUploadthing, type FileRouter } from 'uploadthing/express'

const f = createUploadthing()
const config = { maxFileSize: '16MB' as const, maxFileCount: 5 }
const avatarConfig = { maxFileSize: '1MB' as const, maxFileCount: 1 }
// "Upload to me" dropzones take anything a sender throws at them, so the route is
// keyed on `blob` (UploadThing's catch-all) with its own, much larger cap.
// UploadThing only *types* sizes as powers of two, but parses any number at
// runtime — hence the cast for the 500MB limit the product actually wants.
const requestConfig = { maxFileSize: '500MB', maxFileCount: 5 }

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
  requestUploader: f({ blob: requestConfig } as unknown as Parameters<typeof f>[0]).onUploadComplete((data) => {
    console.log('request upload completed', data)
  }),
  avatarUploader: f({ image: avatarConfig }).onUploadComplete((data) => {
    console.log('avatar upload completed', data)
  }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter
