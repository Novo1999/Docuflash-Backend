import { createHash } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import createJsonResponse from '../utils/createJsonResponse'

const NETWORK_KEY_LENGTH = 24

const resolveNetworkKey = (req: Request): string => {
  const salt = process.env.NETWORK_KEY_SALT ?? 'docuflash-network'
  const ip = req.ip ?? 'unknown'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, NETWORK_KEY_LENGTH)
}

const getNetworkKey = (req: Request, res: Response, next: NextFunction) => {
  try {
    const networkKey = resolveNetworkKey(req)
    return createJsonResponse(res, { msg: 'Network resolved', data: { networkKey }, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

export { getNetworkKey }
