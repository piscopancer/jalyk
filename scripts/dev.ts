import { authStateNames, type AuthState } from '@jalyk/auth/states'
import { storageStateNames, type StorageState } from '@jalyk/core/storage-states'
import { dbStateNames, isSeedState, type DbState } from '@jalyk/db/states'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

// Лаунчер локальной разработки. Заменяет прямой `turbo run dev`: разбирает флаги
// по подсистемам и именованные пресеты, раскрывает их в состояния БД/авторизации/
// хранилища, кладёт выбор в переменные JALYK_*_STATE и запускает turbo. Так
// переключение сценариев идёт командой запуска, а не правкой .env: файл держит
// значения (в т.ч. пары _LOCAL/_PROD), а какое из них взять — решает флаг. Наборы
// имён берутся из чистых модулей пакетов (…/states) — без дублирования и без
// резолва их конфига (он упал бы до установки JALYK_*_STATE).

/** Один сценарий: по состоянию на каждую подсистему. */
type Combo = { db: DbState; storage: StorageState; auth: AuthState }

/** База по умолчанию — всё локальное. */
const BASE = { db: 'local', storage: 'files', auth: 'local' } as const satisfies Combo

/** Именованные наборы; флаги их точечно перебивают. */
const PRESETS = {
  local: BASE,
  staging: { db: 'prod', storage: 'memory', auth: 'prod' },
  'many-users': { db: 'many', storage: 'memory', auth: 'local' },
} as const satisfies Record<string, Combo>

type PresetName = keyof typeof PRESETS

function fail(message: string): never {
  console.error(`dev: ${message}`)
  process.exit(1)
}

/** Разобрать значение флага против набора допустимых имён (или undefined). */
function oneOf<const T extends string>(
  names: readonly T[],
  raw: string | undefined,
  flag: string,
) {
  if (raw === undefined) return undefined
  const match = names.find((name) => name === raw)
  if (match === undefined) fail(`--${flag}=${raw}: допустимо ${names.join(' | ')}`)
  return match
}

const isPreset = (value: string): value is PresetName => value in PRESETS

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    db: { type: 'string' },
    storage: { type: 'string' },
    auth: { type: 'string' },
  },
})

if (positionals.length > 1) fail('ожидается не больше одного пресета')

const [presetArg] = positionals
const preset: Combo =
  presetArg === undefined
    ? BASE
    : isPreset(presetArg)
      ? PRESETS[presetArg]
      : fail(`неизвестный пресет ${presetArg}: ${Object.keys(PRESETS).join(' | ')}`)

const combo: Combo = {
  db: oneOf(dbStateNames, values.db, 'db') ?? preset.db,
  storage: oneOf(storageStateNames, values.storage, 'storage') ?? preset.storage,
  auth: oneOf(authStateNames, values.auth, 'auth') ?? preset.auth,
}

// Выбор состояний — в окружение дочерних процессов (turbo → web/api).
process.env.JALYK_DB_STATE = combo.db
process.env.JALYK_STORAGE_STATE = combo.storage
process.env.JALYK_AUTH_STATE = combo.auth

async function main() {
  // Сид-состояния работают на предзасеянной базе jalyk_seed. Засеваем её ОДИН раз
  // здесь, до старта приложений, чтобы web и api не гонялись за пересоздание схемы.
  // Импорт @jalyk/db динамический — уже после установки JALYK_DB_STATE.
  if (isSeedState(combo.db)) {
    const { applySeed } = await import('@jalyk/db')
    const ddl = readFileSync(
      fileURLToPath(new URL('../packages/db/prisma/schema.sql', import.meta.url)),
      'utf8',
    )
    console.log(`dev: засеваю jalyk_seed профилем "${combo.db}"…`)
    await applySeed(combo.db, ddl)
  }

  console.log(`dev: db=${combo.db} storage=${combo.storage} auth=${combo.auth}`)
  const child = spawn('pnpm', ['turbo', 'run', 'dev'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

void main()
