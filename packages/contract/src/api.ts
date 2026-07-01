import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { FileTooLarge, Forbidden, NotFound, QuotaExceeded } from './errors.ts'
import { Authentication, Authorization } from './middleware.ts'

// Ответ healthcheck: статус сервиса и доступность БД. Растёт по мере добавления
// зависимостей (S3, очереди) — пока только Postgres.
export const HealthStatus = Schema.Struct({
  status: Schema.Literal('ok'),
  db: Schema.Literal('up', 'down'),
})

// Группа служебных эндпоинтов. /health не требует авторизации — её зовёт
// инфраструктура (docker healthcheck, мониторинг).
export const HealthGroup = HttpApiGroup.make('health').add(
  HttpApiEndpoint.get('check', '/health').addSuccess(HealthStatus),
)

// Текущий пользователь, выведенный из bearer-токена сессии.
export const CurrentUserInfo = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
  image: Schema.NullOr(Schema.String),
})

// Группа эндпоинтов аутентифицированного редактора. Защищена Authentication —
// без действительной сессии ответ 401. /me — текущий пользователь; updateProfile
// меняет имя; uploadAvatar загружает аватарку (сырые байты, тип в query) в
// хранилище и проставляет её URL в профиль. Все три про «себя» — без projectId.
export const MeGroup = HttpApiGroup.make('me')
  .add(HttpApiEndpoint.get('me', '/me').addSuccess(CurrentUserInfo))
  .add(
    HttpApiEndpoint.patch('updateProfile', '/me')
      .setPayload(Schema.Struct({ name: Schema.optional(Schema.String) }))
      .addSuccess(CurrentUserInfo),
  )
  .add(
    HttpApiEndpoint.post('uploadAvatar', '/me/avatar')
      .setUrlParams(Schema.Struct({ contentType: Schema.String }))
      .addSuccess(CurrentUserInfo)
      .addError(FileTooLarge),
  )
  .middleware(Authentication)

// Роль участника в проекте — единый литерал для всех схем контракта. Совпадает с
// enum Role в @jalyk/db: owner и editor пишут, reader — только читает.
export const RoleLiteral = Schema.Literal('owner', 'editor', 'reader')

// Доступ принципала к проекту — результат проверки изоляции. role есть только у
// пользователя, scope — только у ключа; canWrite сводит права к флагу записи.
export const ProjectAccessInfo = Schema.Struct({
  kind: Schema.Literal('user', 'key'),
  projectId: Schema.String,
  canWrite: Schema.Boolean,
  role: Schema.optional(RoleLiteral),
  scope: Schema.optional(Schema.Literal('read', 'write')),
})

// Участник проекта для presence: профиль (имя, аватарка), роль, дата входа и
// флаг online на момент запроса. Онлайн дальше обновляется presence-событиями
// SSE-потока. joinedAt — ISO-строка (обработчик приводит из Date).
export const MemberInfo = Schema.Struct({
  userId: Schema.String,
  name: Schema.String,
  image: Schema.NullOr(Schema.String),
  role: RoleLiteral,
  joinedAt: Schema.String,
  online: Schema.Boolean,
})

// Контентные эндпоинты вложены под /projects/:projectId и защищены единым
// middleware Authorization. /access отдаёт разрешённый доступ (404 для чужого
// проекта, 401 без принципала); /members — участников проекта для presence.
export const ProjectsGroup = HttpApiGroup.make('projects')
  .add(
    HttpApiEndpoint.get('access', '/projects/:projectId/access')
      .setPath(Schema.Struct({ projectId: Schema.String }))
      .addSuccess(ProjectAccessInfo)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.get('members', '/projects/:projectId/members')
      .setPath(Schema.Struct({ projectId: Schema.String }))
      .addSuccess(Schema.Array(MemberInfo))
      .addError(NotFound),
  )
  .middleware(Authorization)

// --- документы -----------------------------------------------------------

// Значение документа и его полей — нетипизированный JSON: форму диктует
// клиентская схема студии, сервер её не знает и не валидирует.
const JsonValue = Schema.Unknown

// Документ на проводе. Даты отдаём ISO-строками (обработчик приводит из Date).
export const DocumentInfo = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  draft: JsonValue,
  published: Schema.NullOr(JsonValue),
  publishedAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
})

// Количество документов по типу — для дефолтного <AllDocumentTypes/>.
export const DocumentTypeCount = Schema.Struct({
  type: Schema.String,
  count: Schema.Number,
})

// Путь к полю внутри документа: массив ключей (индекс массива — строкой).
const FieldPath = Schema.Array(Schema.String)

// Применённая path-дельта — основа field-level подписок (SSE).
export const FieldDelta = Schema.Struct({
  path: FieldPath,
  value: JsonValue,
})

export const SchemaSnapshotInfo = Schema.Struct({
  snapshot: Schema.NullOr(JsonValue),
})

const ProjectIdPath = Schema.Struct({ projectId: Schema.String })
const DocumentIdPath = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
})

// Контентные эндпоинты документов, вложены под /projects/:projectId и защищены
// тем же middleware Authorization. Изоляция (404 для чужого проекта) и проверка
// прав записи (403) — в обработчиках через getProjectAccess + canWrite.
export const DocumentsGroup = HttpApiGroup.make('documents')
  .add(
    HttpApiEndpoint.post('create', '/projects/:projectId/documents')
      .setPath(ProjectIdPath)
      .setPayload(
        Schema.Struct({
          type: Schema.String,
          draft: Schema.optional(JsonValue),
        }),
      )
      .addSuccess(DocumentInfo)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.get('list', '/projects/:projectId/documents')
      .setPath(ProjectIdPath)
      .setUrlParams(Schema.Struct({ type: Schema.String }))
      .addSuccess(Schema.Array(DocumentInfo))
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.get('counts', '/projects/:projectId/documents/counts')
      .setPath(ProjectIdPath)
      .addSuccess(Schema.Array(DocumentTypeCount))
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.get('get', '/projects/:projectId/documents/:id')
      .setPath(DocumentIdPath)
      .addSuccess(DocumentInfo)
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.post('setField', '/projects/:projectId/documents/:id/field')
      .setPath(DocumentIdPath)
      .setPayload(Schema.Struct({ path: FieldPath, value: JsonValue }))
      .addSuccess(FieldDelta)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.post(
      'publish',
      '/projects/:projectId/documents/:id/publish',
    )
      .setPath(DocumentIdPath)
      .addSuccess(DocumentInfo)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.post(
      'resetDraft',
      '/projects/:projectId/documents/:id/reset',
    )
      .setPath(DocumentIdPath)
      .addSuccess(DocumentInfo)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.del('delete', '/projects/:projectId/documents/:id')
      .setPath(DocumentIdPath)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.put('putSchema', '/projects/:projectId/schema')
      .setPath(ProjectIdPath)
      .setPayload(Schema.Struct({ snapshot: JsonValue }))
      .addSuccess(SchemaSnapshotInfo)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.get('getSchema', '/projects/:projectId/schema')
      .setPath(ProjectIdPath)
      .addSuccess(SchemaSnapshotInfo)
      .addError(NotFound),
  )
  .middleware(Authorization)

// --- опубликованный контент ----------------------------------------------

// Чтение опубликованного контента сайтами-потребителями. Аргументы запроса —
// нетипизированный JSON (where/select/orderBy/take/skip): их статическую форму
// знает только клиент через @jalyk/schema, сервер исполняет структурно. Защищён
// тем же Authorization (нужен X-Api-Key со scope read); отдаёт лишь published,
// черновики недоступны. Результат — массив спроецированных документов (Unknown).
export const PublishedGroup = HttpApiGroup.make('published')
  .add(
    HttpApiEndpoint.post(
      'query',
      '/projects/:projectId/published/:type/query',
    )
      .setPath(Schema.Struct({ projectId: Schema.String, type: Schema.String }))
      .setPayload(
        Schema.Struct({
          where: Schema.optional(JsonValue),
          select: Schema.optional(JsonValue),
          orderBy: Schema.optional(JsonValue),
          take: Schema.optional(Schema.Number),
          skip: Schema.optional(Schema.Number),
        }),
      )
      .addSuccess(Schema.Array(JsonValue))
      .addError(NotFound),
  )
  .middleware(Authorization)

// --- ассеты --------------------------------------------------------------

// Ассет на проводе. Байты раздаются отдельно по GET /assets/:id; здесь только
// метаданные. Студия строит URL картинки как `${apiUrl}/assets/${id}`.
export const AssetInfo = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  filename: Schema.String,
  contentType: Schema.String,
  size: Schema.Number,
  // Дата загрузки ISO-строкой (обработчик приводит из Date) — для сортировки в студии.
  createdAt: Schema.String,
})

// Использование хранилища проектом: суммарный вес ассетов и текущий лимит, оба в
// байтах. Студия рисует из этого прогресс-бар «Хранилище».
export const AssetUsageInfo = Schema.Struct({
  used: Schema.Number,
  quota: Schema.Number,
})

// Загрузка ассета: тело запроса — сырые байты файла, имя и тип идут в query
// (multipart не используем — так проще и в типах, и на клиенте через fetch).
// Вложена под /projects/:projectId, защищена Authorization, требует прав записи.
export const AssetsGroup = HttpApiGroup.make('assets')
  .add(
    HttpApiEndpoint.post('upload', '/projects/:projectId/assets')
      .setPath(ProjectIdPath)
      .setUrlParams(
        Schema.Struct({ filename: Schema.String, contentType: Schema.String }),
      )
      .addSuccess(AssetInfo)
      .addError(NotFound)
      .addError(Forbidden)
      .addError(FileTooLarge)
      .addError(QuotaExceeded),
  )
  .add(
    HttpApiEndpoint.get('list', '/projects/:projectId/assets')
      .setPath(ProjectIdPath)
      .addSuccess(Schema.Array(AssetInfo))
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.get('usage', '/projects/:projectId/assets/usage')
      .setPath(ProjectIdPath)
      .addSuccess(AssetUsageInfo)
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.del('delete', '/projects/:projectId/assets/:id')
      .setPath(Schema.Struct({ projectId: Schema.String, id: Schema.String }))
      .addError(NotFound)
      .addError(Forbidden),
  )
  .middleware(Authorization)

// Публичная раздача байтов ассета по id. Без middleware: <img> не шлёт X-Api-Key,
// а cuid неугадываем (как у CDN-ссылок Sanity). Ответ — сырые байты (handleRaw).
export const AssetsPublicGroup = HttpApiGroup.make('assetsPublic').add(
  HttpApiEndpoint.get('serve', '/assets/:id')
    .setPath(Schema.Struct({ id: Schema.String }))
    .addError(NotFound),
)

// Публичная раздача аватарки пользователя. Объект в хранилище один на пользователя
// (ключ users/:id, перезаписывается при смене), поэтому отдельной записи в БД нет:
// content-type аватарки едет в query (ct) того URL, что сохранён в User.image при
// загрузке. Без middleware — как и ассеты, <img> ходит без заголовков.
export const UsersPublicGroup = HttpApiGroup.make('usersPublic').add(
  HttpApiEndpoint.get('avatar', '/users/:id/avatar')
    .setPath(Schema.Struct({ id: Schema.String }))
    .setUrlParams(Schema.Struct({ ct: Schema.optional(Schema.String) }))
    .addError(NotFound),
)

// --- поток событий -------------------------------------------------------

// SSE-поток изменений проекта: один на проект, раздаёт все дельты (field/create/
// publish/delete), клиент фильтрует по docId/type/path сам. Ответ — сырой
// text/event-stream (handleRaw), поэтому addSuccess не объявляем.
export const EventsGroup = HttpApiGroup.make('events')
  .add(
    HttpApiEndpoint.get('events', '/projects/:projectId/events')
      .setPath(Schema.Struct({ projectId: Schema.String }))
      .addError(NotFound),
  )
  .middleware(Authorization)

// Корневое описание HTTP-API студии. Сюда подключаются остальные группы
// (документы, ассеты, проекты) по мере реализации.
export class Api extends HttpApi.make('jalyk')
  .add(HealthGroup)
  .add(MeGroup)
  .add(ProjectsGroup)
  .add(DocumentsGroup)
  .add(PublishedGroup)
  .add(AssetsGroup)
  .add(AssetsPublicGroup)
  .add(UsersPublicGroup)
  .add(EventsGroup) {}
