import { Router } from 'express'
import { googleNative, login, logout, me, oauthCallback, oauthRedirect, refresh, register, updateMe } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, updateMe)
router.post('/oauth/google/native', googleNative)
router.get('/callback', oauthCallback)
router.get('/oauth/:provider', oauthRedirect)

export default router
