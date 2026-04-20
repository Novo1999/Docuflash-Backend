import dotenv from 'dotenv'
import 'reflect-metadata'
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm'

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
  entities: ['src/entity/**/*.ts'],
  migrations: ['src/migration/**/*.ts'],
  subscribers: ['src/subscriber/**/*.ts'],
})
export function useTypeORM<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
  if (!AppDataSource || !AppDataSource.isInitialized) {
    throw new Error('TypeORM has not been initialized!')
  }

  return AppDataSource.getRepository(entity)
}
