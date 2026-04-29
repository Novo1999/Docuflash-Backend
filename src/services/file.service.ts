import { useTypeORM } from '@/data-source'
import { FileEntity } from '@/entity/file.entity'
import { AppError } from '@/errors/AppError'
import { DeepPartial } from 'typeorm'

const getFileByToken = async (token: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const fileByToken = await fileRepository.findOneBy({ shareToken: token })

  if (!fileByToken) throw new AppError('File not found', 404)

  return fileByToken
}

const deleteFileById = async (id: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const result = await fileRepository.delete({ id })

  if (result.affected === 0) throw new AppError('File not found', 404)
}

const uploadFileService = async (payload: DeepPartial<FileEntity>) => {
  const fileRepository = useTypeORM(FileEntity)

  const file = fileRepository.create(payload)

  const savedFile = await fileRepository.save(file)

  return savedFile
}

export { deleteFileById, getFileByToken, uploadFileService }
