import { useTypeORM } from '@/data-source'
import { FileEntity } from '@/entity/file.entity'
import { AppError } from '@/errors/AppError'

const getFileById = async (id: string) => {
  const fileRepository = useTypeORM(FileEntity)

  const fileById = await fileRepository.findOneBy({ id })

  if (!fileById) throw new AppError('File not found', 404)

  return fileById
}

export { getFileById }
