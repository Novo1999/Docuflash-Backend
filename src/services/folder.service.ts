import { UTApi } from 'uploadthing/server'
import { useTypeORM } from '../data-source'
import { FileEntity } from '../entity/file.entity'
import { FolderEntity } from '../entity/folder.entity'
import { AppError } from '../errors/AppError'
import { FolderPayload } from '../types/folder'
import { decryptStorageKey } from '../utils/fileProtection'

const createFolderService = async (payload: FolderPayload) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  const files = payload.fileIds.map((id) => fileRepository.create({ id }))

  const folder = folderRepository.create({
    folderName: payload.folderName,
    shareToken: payload.shareToken,
    files,
  })

  return folderRepository.save(folder)
}

const getFolderByTokenService = async (token: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { shareToken: token },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  return folder
}

const getFolderByIdService = async (id: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { id },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  return folder
}

const deleteFolderByTokenService = async (token: string) => {
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { shareToken: token },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  await folderRepository.remove(folder)
}

const deleteFolderByIdService = async (id: string) => {
  const fileRepository = useTypeORM(FileEntity)
  const folderRepository = useTypeORM(FolderEntity)

  const folder = await folderRepository.findOne({
    where: { id },
    relations: { files: true },
  })

  if (!folder) throw new AppError('Folder not found', 404)

  if (folder.files.length > 0) {
    console.log("🚀 ~ deleteFolderByIdService ~ files:", folder.files)
    const storageKeys = folder.files.map((f) => decryptStorageKey(f.masterEncryptedStorageKey, process.env.MASTER_ENCRYPTION_KEY!, process.env.MASTER_SALT!))
    console.log("🚀 ~ deleteFolderByIdService ~ storageKeys:", storageKeys)

    const utapi = new UTApi()
    await utapi.deleteFiles(storageKeys)
    await fileRepository.delete(folder.files.map((f) => f.id))
  }

  await folderRepository.remove(folder)
}
export { createFolderService, deleteFolderByIdService, deleteFolderByTokenService, getFolderByIdService, getFolderByTokenService }
