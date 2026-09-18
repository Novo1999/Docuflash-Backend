import { Router } from 'express'
import { deleteMe, forgotPassword, googleNative, login, logout, me, oauthCallback, oauthRedirect, refresh, register, requestAccountDeletion, resetPassword, updateMe } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth'
import { accountDeletionRequestLimiter } from '../middleware/security'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/account-deletion/request', accountDeletionRequestLimiter, requestAccountDeletion)
router.post('/reset-password', resetPassword)
router.post('/refresh', refresh)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, updateMe)
router.delete('/me', requireAuth, deleteMe)
router.post('/oauth/google/native', googleNative)
router.get('/callback', oauthCallback)
router.get('/oauth/:provider', oauthRedirect)

export default router
