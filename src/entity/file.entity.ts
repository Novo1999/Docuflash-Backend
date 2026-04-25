import { DeviceInfo, FileAccessType, FileType } from '@/types/file'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

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

  @Column()
  password!: string

  @Column()
  clientId!: string

  @Column({
    type: 'enum',
    enum: FileAccessType,
  })
  accessType!: FileAccessType

  @Column()
  downloadCount!: number

  @Column('timestamp without time zone')
  expireAt!: Date

  @Column()
  fileSize!: number

  @Column('json')
  deviceInfo!: DeviceInfo
}
