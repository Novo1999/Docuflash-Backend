import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNotes20260718000000 implements MigrationInterface {
  name = 'AddNotes20260718000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "note_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying, "content" text NOT NULL DEFAULT '', "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_note_entity_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_note_entity_ownerId" ON "note_entity" ("ownerId")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_note_entity_ownerId"`)
    await queryRunner.query(`DROP TABLE "note_entity"`)
  }
}
