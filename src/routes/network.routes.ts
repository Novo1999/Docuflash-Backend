import { Router } from 'express'
import { getNetworkKey } from '../controllers/network.controller'
import { optionalAuth } from '../middleware/auth'

const router = Router()

router.get('/whoami', optionalAuth, getNetworkKey)

export default router
