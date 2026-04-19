import { DeviceInfo, FileAccessType, FileType } from '@/types/file'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class File {
  @PrimaryGeneratedColumn()
  id!: number

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

  @Column('datetime')
  expireAt!: Date

  @Column()
  fileSize!: number

  @Column('json')
  deviceInfo!: DeviceInfo
}
