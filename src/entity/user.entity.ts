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

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
