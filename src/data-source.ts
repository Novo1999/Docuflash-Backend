import dotenv from 'dotenv'
import 'reflect-metadata'
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm'
import { FileEntity } from './entity/file.entity'

dotenv.config()

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PGSQL_HOST || 'localhost',
  port: parseInt(process.env.PGSQL_PORT || '5432'),
  username: process.env.PGSQL_USERNAME || 'postgres',
  password: process.env.PGSQL_PASSWORD || 'postgres',
  database: process.env.PGSQL_DATABASE || 'postgres',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [FileEntity],
  migrations: [],
  subscribers: [],
})

export function useTypeORM<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
  if (!AppDataSource || !AppDataSource.isInitialized) {
    throw new Error('TypeORM has not been initialized!')
  }

  return AppDataSource.getRepository(entity)
}
