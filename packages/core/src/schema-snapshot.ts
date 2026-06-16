import { Prisma } from '@jalyk/db'
import { query } from './db.ts'

// Снапшот схемы проекта — один текущий на проект. Студия синхронизирует его при
// изменении конфига. Сервер хранит его впрок и пока только отдаёт обратно;
// валидации контента против снапшота нет (вся валидация — на клиенте).

/** Сохранить (создать или обновить) снапшот схемы проекта. */
export const putSchemaSnapshot = (projectId: string, snapshot: unknown) =>
  query((db) =>
    db.projectSchema.upsert({
      where: { projectId },
      create: { projectId, snapshot: snapshot as Prisma.InputJsonValue },
      update: { snapshot: snapshot as Prisma.InputJsonValue },
    }),
  )

/** Текущий снапшот схемы проекта, либо null. */
export const getSchemaSnapshot = (projectId: string) =>
  query((db) => db.projectSchema.findUnique({ where: { projectId } }))
