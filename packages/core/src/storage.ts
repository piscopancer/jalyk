import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Config, ConfigError, Context, Effect, Layer, Redacted } from 'effect'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { StorageError } from './errors.ts'
import { storageStateNames, type StorageState } from './storage-states.ts'

// Абстракция хранилища ассетов: общий Effect-слой, за которым прячется конкретный
// бэкенд. Тег несёт две операции по ключу (внутренний путь объекта) — запись и
// чтение байтов. contentType хранится в БД (модель Asset), поэтому хранилище
// оперирует только сырыми байтами. Окружения подставляют свой Layer: тестовое —
// локальная папка, прод — S3-совместимое хранилище (Supabase Storage / R2 / Yandex).
export class AssetStorage extends Context.Tag('AssetStorage')<
  AssetStorage,
  {
    readonly write: (
      key: string,
      bytes: Uint8Array,
    ) => Effect.Effect<void, StorageError>
    readonly read: (key: string) => Effect.Effect<Uint8Array, StorageError>
    readonly remove: (key: string) => Effect.Effect<void, StorageError>
  }
>() {}

// Папка для тестового хранилища. Путь относительный резолвится от cwd процесса
// api (apps/api). Обязателен: без JALYK_UPLOADS_DIR слой local-хранилища падает,
// а не пишет в неявную папку uploads.
const uploadsDir = Config.string('JALYK_UPLOADS_DIR')

/** Тестовая реализация: ассеты как файлы в локальной папке. Ключ — относительный
 * путь вида `projectId/uuid`; родительские каталоги создаются при записи. */
export const LocalAssetStorageLive = Layer.effect(
  AssetStorage,
  Effect.gen(function* () {
    const baseDir = resolve(yield* uploadsDir)
    const pathFor = (key: string) => join(baseDir, key)
    return AssetStorage.of({
      write: (key, bytes) =>
        Effect.tryPromise({
          try: async () => {
            const file = pathFor(key)
            await mkdir(dirname(file), { recursive: true })
            await writeFile(file, bytes)
          },
          catch: (cause) => new StorageError({ cause }),
        }),
      read: (key) =>
        Effect.tryPromise({
          try: async () => new Uint8Array(await readFile(pathFor(key))),
          catch: (cause) => new StorageError({ cause }),
        }),
      // Удаление байтов; force, чтобы отсутствующий файл не считался ошибкой
      // (запись в БД — источник истины, хранилище лишь догоняем).
      remove: (key) =>
        Effect.tryPromise({
          try: () => rm(pathFor(key), { force: true }),
          catch: (cause) => new StorageError({ cause }),
        }),
    })
  }),
)

// Конфиг S3-совместимого хранилища (Supabase Storage, Cloudflare R2, Yandex —
// различаются лишь endpoint). Все значения обязательны при storage-состоянии s3.
const s3Config = Config.all({
  endpoint: Config.string('JALYK_S3_ENDPOINT'),
  region: Config.string('JALYK_S3_REGION'),
  bucket: Config.string('JALYK_S3_BUCKET'),
  accessKeyId: Config.string('JALYK_S3_ACCESS_KEY_ID'),
  secretAccessKey: Config.redacted('JALYK_S3_SECRET_ACCESS_KEY'),
})

/** Прод-хранилище: S3-совместимый бэкенд через @aws-sdk/client-s3. Бакет остаётся
 * приватным — байты отдаёт api проксированием (см. handler `serve`), поэтому
 * presigned-URL не нужны, read возвращает полный буфер. forcePathStyle включён:
 * у Supabase/R2 объекты адресуются как endpoint/bucket/key, а не виртуальным
 * хостом. Ключ — внутренний путь объекта вида `projectId/uuid`. */
export const S3AssetStorageLive = Layer.effect(
  AssetStorage,
  Effect.gen(function* () {
    const cfg = yield* s3Config
    const client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: Redacted.value(cfg.secretAccessKey),
      },
    })
    return AssetStorage.of({
      write: (key, bytes) =>
        Effect.tryPromise({
          try: () =>
            client.send(
              new PutObjectCommand({
                Bucket: cfg.bucket,
                Key: key,
                Body: bytes,
              }),
            ),
          catch: (cause) => new StorageError({ cause }),
        }).pipe(Effect.asVoid),
      read: (key) =>
        Effect.tryPromise({
          try: async () => {
            const res = await client.send(
              new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
            )
            const bytes = await res.Body!.transformToByteArray()
            return bytes
          },
          catch: (cause) => new StorageError({ cause }),
        }),
      // force-семантика как у локального драйвера: запись в БД — источник истины,
      // отсутствующий объект ошибкой не считаем (DeleteObject и так идемпотентен).
      remove: (key) =>
        Effect.tryPromise({
          try: () =>
            client.send(
              new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
            ),
          catch: (cause) => new StorageError({ cause }),
        }).pipe(Effect.asVoid),
    })
  }),
)

/** Тестовая реализация: ассеты в оперативной памяти процесса (Map ключ → байты).
 * Ничего не пишет на диск и в сеть, при рестарте пусто. Удобно гонять сценарии,
 * где важна БД-часть (много записей Asset), а сами байты неважны. */
export const InMemoryAssetStorageLive = Layer.sync(AssetStorage, () => {
  const store = new Map<string, Uint8Array>()
  return AssetStorage.of({
    write: (key, bytes) => Effect.sync(() => void store.set(key, bytes)),
    read: (key) => {
      const bytes = store.get(key)
      return bytes === undefined
        ? Effect.fail(new StorageError({ cause: new Error(`нет объекта ${key}`) }))
        : Effect.succeed(bytes)
    },
    remove: (key) => Effect.sync(() => void store.delete(key)),
  })
})

/** Реестр состояний хранилища: имя → Layer<AssetStorage>. files/s3 — боевые
 * (локальные файлы / S3-совместимое), memory — тестовое in-memory. Добавить новую
 * реализацию = дописать сюда ещё одну пару (ключи сверяются с storageStateNames). */
export const storageStates = {
  files: LocalAssetStorageLive,
  s3: S3AssetStorageLive,
  memory: InMemoryAssetStorageLive,
} satisfies Record<StorageState, Layer.Layer<AssetStorage, ConfigError.ConfigError>>

// Активное состояние выбирается переменной JALYK_STORAGE_STATE (литерал по именам
// из storage-states — неизвестное или отсутствующее имя падает с ConfigError). В
// деве её выставляет лаунчер из флага --storage, в проде — задаётся явно в дашборде.
export const StorageStateLive = Layer.unwrapEffect(
  Config.literal(...storageStateNames)('JALYK_STORAGE_STATE').pipe(
    Effect.map((name) => storageStates[name]),
  ),
)
