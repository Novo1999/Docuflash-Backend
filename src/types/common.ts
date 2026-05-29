import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
export type TypedBodyRequest<TBody> = Request<ParamsDictionary, unknown, TBody>
export enum AccessType {
  PROTECTED = 'protected',
  PUBLIC = 'public',
}
