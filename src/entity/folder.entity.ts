import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm'
import { FileEntity } from './file.entity'

@Entity()
export class FolderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  folderName!: string

  @Column()
  shareToken!: string

  @ManyToMany(() => FileEntity, (file) => file.folder, { cascade: ['remove'] })
  @JoinTable()
  files!: FileEntity[]

  @CreateDateColumn()
  createdAt!: Date

  @Column('timestamp without time zone', { nullable: true })
  expireAt!: Date
}
