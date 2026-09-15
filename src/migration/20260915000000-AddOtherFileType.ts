import { MigrationInterface, QueryRunner } from 'typeorm'

type EnumRow = { enumName: string }

/**
 * Adds 'other' to the file type enum so the "upload to me" dropzone can accept
 * arbitrary files, not just the handful of document formats we recognise.
 *
 * The enum's type name is looked up from the catalog rather than hard-coded:
 * the schema was originally created by TypeORM's `synchronize`, so the generated
 * name isn't guaranteed across environments. The rename/recreate dance is used
 * instead of `ALTER TYPE ... ADD VALUE` because the latter can't be relied on
 * inside the transaction TypeORM wraps migrations in.
 */
export class AddOtherFileType20260915000000 implements MigrationInterface {
  name = 'AddOtherFileType20260915000000'

  private async getEnumName(queryRunner: QueryRunner): Promise<string | null> {
    const rows: EnumRow[] = await queryRunner.query(`
      SELECT t.typname AS "enumName"
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE c.relname = 'file_entity' AND a.attname = 'fileType' AND n.nspname = 'public' AND t.typtype = 'e'
    `)

    return rows[0]?.enumName ?? null
  }

  private async replaceEnum(queryRunner: QueryRunner, values: string[]): Promise<void> {
    const enumName = await this.getEnumName(queryRunner)
    if (!enumName) throw new Error('Could not resolve the enum type backing file_entity."fileType"')

    const literals = values.map((value) => `'${value}'`).join(', ')

    await queryRunner.query(`ALTER TYPE "public"."${enumName}" RENAME TO "${enumName}_old"`)
    await queryRunner.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${literals})`)
    await queryRunner.query(
      `ALTER TABLE "file_entity" ALTER COLUMN "fileType" TYPE "public"."${enumName}" USING "fileType"::"text"::"public"."${enumName}"`,
    )
    await queryRunner.query(`DROP TYPE "public"."${enumName}_old"`)
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceEnum(queryRunner, ['pdf', 'xls', 'txt', 'zip', 'docx', 'other'])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rows that only exist because of this migration have no older equivalent,
    // so fold them into 'zip' — the most generic of the remaining values.
    await queryRunner.query(`UPDATE "file_entity" SET "fileType" = 'zip' WHERE "fileType" = 'other'`)
    await this.replaceEnum(queryRunner, ['pdf', 'xls', 'txt', 'zip', 'docx'])
  }
}
