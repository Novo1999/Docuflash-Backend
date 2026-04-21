import { uploadRouter } from '@/utils/uploadthing'

import { createRouteHandler } from 'uploadthing/express'

const uploadThingRouter = createRouteHandler({
  router: uploadRouter,
})

export { uploadThingRouter }
