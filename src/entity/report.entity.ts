import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { ReportReason, ReportStatus, ReportTargetType } from '../types/moderation'

@Entity()
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({
    type: 'enum',
    enum: ReportTargetType,
  })
  targetType!: ReportTargetType

  @Index()
  @Column()
  shareToken!: string

  @Column('uuid', { nullable: true })
  targetId!: string | null

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason!: ReportReason

  @Column({ type: 'text', nullable: true })
  details!: string | null

  @Column({ type: 'varchar', nullable: true })
  reporterEmail!: string | null

  @Column('uuid', { nullable: true })
  reporterUserId!: string | null

  @Index()
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus

  @Column({ type: 'text', nullable: true })
  resolutionNote!: string | null

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null

  @CreateDateColumn()
  createdAt!: Date
}
