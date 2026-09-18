import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm'

@Entity()
@Unique('UQ_blocked_sender_folder_sender', ['folderId', 'senderClientId'])
export class BlockedSenderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column('uuid')
  folderId!: string

  @Column()
  senderClientId!: string

  @Index()
  @Column('uuid', { nullable: true })
  ownerId!: string | null

  @Column({ type: 'varchar', nullable: true })
  ownerClientId!: string | null

  @CreateDateColumn()
  createdAt!: Date
}
