import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm'
import { AccessType } from '../types/common'
import { DeviceInfo, FileType } from '../types/file'
import { FolderEntity } from './folder.entity'

@Entity()
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  fileName!: string

  @Column({
    type: 'enum',
    enum: FileType,
  })
  fileType!: FileType

  @Column()
  shareToken!: string

  @Column()
  storageKey!: string

  @Column({ nullable: true })
  password!: string

  @Column()
  clientId!: string

  @Column({ nullable: true })
  salt!: string

  @Column({ nullable: true })
  masterEncryptedStorageKey!: string

  @Column({
    type: 'enum',
    enum: AccessType,
  })
  accessType!: AccessType

  @Column()
  downloadCount!: number

  @Column('timestamp without time zone')
  expireAt!: Date

  @Column()
  fileSize!: number

  @Column('json')
  deviceInfo!: DeviceInfo

  @CreateDateColumn()
  createdAt!: Date

  @ManyToMany(() => FolderEntity, (folder) => folder.files)
  folder?: FolderEntity[]
}
