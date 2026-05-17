import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm'
import { FileEntity } from './file.entity'

@Entity()
export class FolderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  folderName!: string

  @ManyToMany(() => FileEntity, (file) => file.folder)
  @JoinTable()
  files!: FileEntity[]
}
