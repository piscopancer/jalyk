import { Config } from 'effect'

// Конфигурация API-сервера через Effect Config. Порт читается из PORT,
// дефолт 3001 (3000 занимает сайт-платформа apps/web в деве).
export const port = Config.integer('PORT').pipe(Config.withDefault(3001))

// Драйвер хранилища ассетов: local — файлы в папке uploads (тест/дев),
// s3 — прод (S3-совместимое: Supabase Storage / R2 / Yandex). Дефолт local.
export const storageDriver = Config.literal(
  'local',
  's3',
)('JALYK_STORAGE').pipe(Config.withDefault('local' as const))
