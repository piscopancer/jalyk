import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { Authorization } from './authz.ts'
import { Forbidden, NotFound } from './errors.ts'
import { Authentication } from './middleware.ts'

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
// без действительной сессии ответ 401. Пока только /me для проверки.
export const MeGroup = HttpApiGroup.make('me')
  .add(HttpApiEndpoint.get('me', '/me').addSuccess(CurrentUserInfo))
  .middleware(Authentication)

// Доступ принципала к проекту — результат проверки изоляции. role есть только у
// пользователя, scope — только у ключа; canWrite сводит права к флагу записи.
export const ProjectAccessInfo = Schema.Struct({
  kind: Schema.Literal('user', 'key'),
  projectId: Schema.String,
  canWrite: Schema.Boolean,
  role: Schema.optional(Schema.Literal('owner', 'editor')),
  scope: Schema.optional(Schema.Literal('read', 'write')),
})

// Контентные эндпоинты вложены под /projects/:projectId и защищены единым
// middleware Authorization. Пока только проверочный /access — отдаёт разрешённый
// доступ, упадёт 404 для чужого проекта (изоляция) и 401 без принципала.
export const ProjectsGroup = HttpApiGroup.make('projects')
  .add(
    HttpApiEndpoint.get('access', '/projects/:projectId/access')
      .setPath(Schema.Struct({ projectId: Schema.String }))
      .addSuccess(ProjectAccessInfo)
      .addError(NotFound)
      .addError(Forbidden),
  )
  .middleware(Authorization)

// Корневое описание HTTP-API студии. Сюда подключаются остальные группы
// (документы, ассеты, проекты) по мере реализации.
export class Api extends HttpApi.make('jalyk').add(HealthGroup).add(MeGroup).add(ProjectsGroup) {}
