import { Config } from 'effect'

// Конфигурация API-сервера через Effect Config. Порт читается из PORT,
// дефолт 3001 (3000 занимает сайт-платформа apps/web в деве).
export const port = Config.integer('PORT').pipe(Config.withDefault(3001))
