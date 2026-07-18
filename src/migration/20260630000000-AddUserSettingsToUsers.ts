import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserSettingsToUsers20260630000000 implements MigrationInterface {
  name = 'AddUserSettingsToUsers20260630000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_entity" ADD COLUMN IF NOT EXISTS "defaultExpiry" character varying NOT NULL DEFAULT '7d'`)
    await queryRunner.query(`ALTER TABLE "user_entity" ADD COLUMN IF NOT EXISTS "defaultPrivacy" character varying NOT NULL DEFAULT 'protected'`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "defaultPrivacy"`)
    await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "defaultExpiry"`)
  }
}
