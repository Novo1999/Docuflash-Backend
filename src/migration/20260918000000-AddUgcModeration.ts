import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUgcModeration20260918000000 implements MigrationInterface {
  name = 'AddUgcModeration20260918000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."report_entity_targettype_enum" AS ENUM('file', 'folder')`)
    await queryRunner.query(
      `CREATE TYPE "public"."report_entity_reason_enum" AS ENUM('csam', 'non_consensual', 'illegal', 'malware', 'harassment', 'intellectual_property', 'spam', 'other')`,
    )
    await queryRunner.query(`CREATE TYPE "public"."report_entity_status_enum" AS ENUM('pending', 'reviewing', 'actioned', 'dismissed')`)

    await queryRunner.query(
      `CREATE TABLE "report_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "targetType" "public"."report_entity_targettype_enum" NOT NULL, "shareToken" character varying NOT NULL, "targetId" uuid, "reason" "public"."report_entity_reason_enum" NOT NULL, "details" text, "reporterEmail" character varying, "reporterUserId" uuid, "status" "public"."report_entity_status_enum" NOT NULL DEFAULT 'pending', "resolutionNote" text, "reviewedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_report_entity_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_report_entity_shareToken" ON "report_entity" ("shareToken")`)
    await queryRunner.query(`CREATE INDEX "IDX_report_entity_status" ON "report_entity" ("status")`)

    await queryRunner.query(
      `CREATE TABLE "blocked_sender_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "folderId" uuid NOT NULL, "senderClientId" character varying NOT NULL, "ownerId" uuid, "ownerClientId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_blocked_sender_entity_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_blocked_sender_folder_sender" UNIQUE ("folderId", "senderClientId"))`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_blocked_sender_entity_folderId" ON "blocked_sender_entity" ("folderId")`)
    await queryRunner.query(`CREATE INDEX "IDX_blocked_sender_entity_ownerId" ON "blocked_sender_entity" ("ownerId")`)

    await queryRunner.query(`ALTER TABLE "user_entity" ADD "termsAcceptedAt" TIMESTAMP`)
    await queryRunner.query(`ALTER TABLE "user_entity" ADD "termsVersion" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "termsVersion"`)
    await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "termsAcceptedAt"`)

    await queryRunner.query(`DROP INDEX "IDX_blocked_sender_entity_ownerId"`)
    await queryRunner.query(`DROP INDEX "IDX_blocked_sender_entity_folderId"`)
    await queryRunner.query(`DROP TABLE "blocked_sender_entity"`)

    await queryRunner.query(`DROP INDEX "IDX_report_entity_status"`)
    await queryRunner.query(`DROP INDEX "IDX_report_entity_shareToken"`)
    await queryRunner.query(`DROP TABLE "report_entity"`)

    await queryRunner.query(`DROP TYPE "public"."report_entity_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."report_entity_reason_enum"`)
    await queryRunner.query(`DROP TYPE "public"."report_entity_targettype_enum"`)
  }
}
