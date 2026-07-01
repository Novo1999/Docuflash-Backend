import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string

  @Column({ unique: true })
  email!: string

  @Column({ nullable: true })
  displayName!: string

  @Column({ nullable: true })
  avatarUrl!: string

  @Column({ nullable: true })
  provider!: string

  @Column({ default: '7d' })
  defaultExpiry!: string

  @Column({ type: 'varchar', default: 'protected' })
  defaultPrivacy!: 'public' | 'protected'

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
