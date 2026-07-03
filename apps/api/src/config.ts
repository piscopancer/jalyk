import { Config } from 'effect'

// Конфигурация API-сервера через Effect Config. Порт читается из PORT и
// обязателен: если переменная не задана, процесс падает с ConfigError, а не
// стартует на скрытом дефолте. В деве порт задаётся в .env (web занимает 3000),
// в проде PORT проставляет хостинг (Render/Railway).
export const port = Config.integer('PORT')

// Состояние хранилища ассетов выбирается переменной JALYK_STORAGE_STATE и живёт в
// @jalyk/core (реестр storageStates / StorageStateLive) — здесь его читать не нужно.
