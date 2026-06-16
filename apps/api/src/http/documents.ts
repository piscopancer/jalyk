import { HttpApiBuilder } from '@effect/platform'
import {
  countDocumentsByType,
  createDocument,
  type DbError,
  deleteDocument,
  getDocument,
  NotFoundError,
  getSchemaSnapshot,
  listDocuments,
  publishDocument,
  putSchemaSnapshot,
  setDocumentField,
} from '@jalyk/core'
import type { Document } from '@jalyk/db'
import { Effect } from 'effect'
import { Api, NotFound } from '@jalyk/contract'
import { publishEvent } from '../events.ts'
import { access, writeAccess } from './access.ts'

// Документ из БД → форма на проводе: даты в ISO-строки, JSON отдаём как есть.
const toInfo = (doc: Document) => ({
  id: doc.id,
  type: doc.type,
  draft: doc.draft,
  published: doc.published ?? null,
  publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
})

// Доменные ошибки операций над документом мапим единообразно: отсутствие → 404,
// сбой БД → 500. Применяется после проверки доступа, в самих операциях.
const mapDocErrors = <A, R>(eff: Effect.Effect<A, NotFoundError | DbError, R>) =>
  eff.pipe(
    Effect.catchTag('NotFoundError', () => new NotFound()),
    Effect.catchTag('DbError', (e) => Effect.die(e)),
  )

export const DocumentsLive = HttpApiBuilder.group(Api, 'documents', (handlers) =>
  handlers
    .handle('create', ({ path, payload }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(() =>
          mapDocErrors(createDocument(path.projectId, payload.type, payload.draft ?? {})),
        ),
        Effect.tap((doc) =>
          publishEvent(path.projectId, {
            kind: 'create',
            docId: doc.id,
            type: doc.type,
            draft: doc.draft,
          }),
        ),
        Effect.map(toInfo),
      ),
    )
    .handle('list', ({ path, urlParams }) =>
      access(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(listDocuments(path.projectId, urlParams.type))),
        Effect.map((docs) => docs.map(toInfo)),
      ),
    )
    .handle('counts', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(countDocumentsByType(path.projectId))),
      ),
    )
    .handle('get', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(getDocument(path.projectId, path.id))),
        Effect.flatMap((doc) => (doc ? Effect.succeed(toInfo(doc)) : new NotFound())),
      ),
    )
    .handle('setField', ({ path, payload }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(() =>
          mapDocErrors(setDocumentField(path.projectId, path.id, payload.path, payload.value)),
        ),
        Effect.tap((delta) =>
          publishEvent(path.projectId, {
            kind: 'field',
            docId: path.id,
            type: delta.type,
            path: delta.path,
            value: delta.value,
          }),
        ),
        // тип нужен только для события; на проводе отдаём чистую дельту.
        Effect.map((delta) => ({ path: delta.path, value: delta.value })),
      ),
    )
    .handle('publish', ({ path }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(publishDocument(path.projectId, path.id))),
        Effect.tap((doc) =>
          publishEvent(path.projectId, {
            kind: 'publish',
            docId: doc.id,
            type: doc.type,
            publishedAt: (doc.publishedAt ?? new Date()).toISOString(),
          }),
        ),
        Effect.map(toInfo),
      ),
    )
    .handle('delete', ({ path }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(deleteDocument(path.projectId, path.id))),
        Effect.tap((deleted) =>
          publishEvent(path.projectId, { kind: 'delete', docId: path.id, type: deleted.type }),
        ),
        Effect.asVoid,
      ),
    )
    .handle('putSchema', ({ path, payload }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(putSchemaSnapshot(path.projectId, payload.snapshot))),
        Effect.map((row) => ({ snapshot: row.snapshot })),
      ),
    )
    .handle('getSchema', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(() => mapDocErrors(getSchemaSnapshot(path.projectId))),
        Effect.map((row) => ({ snapshot: row?.snapshot ?? null })),
      ),
    ),
)
