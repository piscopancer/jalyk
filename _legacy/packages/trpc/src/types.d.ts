declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL: string
    readonly YANDEX_S3_ACCESS_KEY_ID: string
    readonly YANDEX_S3_SECRET_ACCESS_KEY: string
  }
}
