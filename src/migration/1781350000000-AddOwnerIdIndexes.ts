import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOwnerIdIndexes1781350000000 implements MigrationInterface {
  name = 'AddOwnerIdIndexes1781350000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_file_entity_ownerId" ON "file_entity" ("ownerId")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_folder_entity_ownerId" ON "folder_entity" ("ownerId")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_folder_entity_ownerId"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_file_entity_ownerId"`)
  }
}
