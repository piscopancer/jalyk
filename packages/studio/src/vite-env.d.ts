// Студия собирается vite приложения-потребителя, поэтому переменные сборки
// (import.meta.env.VITE_*) подставляются на его стороне. Объявляем только те, что
// читает сама студия, чтобы не тянуть в пакет полный пакет типов vite/client.
interface ImportMetaEnv {
  /** Переопределение боевого адреса apps/api (см. data/site.ts). */
  readonly VITE_JALYK_API_URL?: string
  /** Переопределение боевого адреса центрального домена apps/web (см. data/site.ts). */
  readonly VITE_JALYK_AUTH_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
