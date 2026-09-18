import { Router } from 'express'
import { blockSender, createReport, listBlockedSenders, listReports, unblockSender, updateReport } from '../controllers/moderation.controller'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { reportLimiter } from '../middleware/security'

const router = Router()

router.post('/reports', reportLimiter, optionalAuth, createReport)
router.get('/reports', requireAuth, listReports)
router.patch('/reports/:id', requireAuth, updateReport)
router.get('/blocked-senders', optionalAuth, listBlockedSenders)
router.post('/blocked-senders', optionalAuth, blockSender)
router.delete('/blocked-senders/:id', optionalAuth, unblockSender)

export default router
