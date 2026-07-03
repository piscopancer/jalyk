import babel from '@rolldown/plugin-babel'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Config, Effect } from 'effect'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig, loadEnv } from 'vite'

// Пресет сборки Nitro. Читается через Effect Config литералом и обязателен: без
// NITRO_PRESET или при неверной строке конфигурация падает, а не собирается
// «мимо». Локально задаётся node-server (.output/server), на Vercel — vercel
// (сборка в .vercel/output, Build Output API). Резолвится ВНУТРИ defineConfig,
// после loadEnv — иначе переменная из корневого .env ещё не в process.env.
const resolveNitroPreset = () =>
  Effect.runSync(Config.literal('node-server', 'vercel')('NITRO_PRESET'))

// Опциональный локальный https: если в окружении заданы пути к сертификату и ключу
// (HTTPS_CERT_FILE/HTTPS_KEY_FILE, относительно корня монорепы), dev-сервер
// поднимается по https. Нужно для входа через стабильный домен jalyk.local.dev
// (Google OAuth требует https; студия по https не может звать api по http —
// mixed content). В проде переменные не заданы — остаётся обычный http за прокси.
function devHttps(root: string) {
  const cert = process.env.HTTPS_CERT_FILE
  const key = process.env.HTTPS_KEY_FILE
  if (!cert || !key) return undefined
  return {
    cert: fs.readFileSync(path.resolve(root, cert)),
    key: fs.readFileSync(path.resolve(root, key)),
  }
}

// Секреты (BETTER_AUTH_*, OAuth-креды) лежат в общем .env в корне монорепы.
// Vite сам по себе в process.env ничего не кладёт и видит только VITE_-префикс,
// а better-auth читает голый process.env на сервере — поэтому подгружаем все
// переменные из корня (префикс '') в process.env dev-сервера вручную.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, monorepoRoot, ''))
  return {
    server: { port: 3000, host: true, https: devHttps(monorepoRoot) },
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart(),
      // Прод-сборка Start больше не пакует Nitro сама — без этого плагина
      // `vite build` останавливается на dist/ (только fetch-хендлер) и не создаёт
      // запускаемый сервер. Пресет берётся из nitroPreset (см. выше).
      nitroV2Plugin({ preset: resolveNitroPreset() }),
      viteReact(),
      // React Compiler автоматически мемоизирует рендеры. В plugin-react v6 (oxc/
      // rolldown) старый способ `viteReact({ babel: { plugins: [...] } })` не
      // работает — babel-конвейера в плагине больше нет, и опция молча игнорируется.
      // Компилятор подключается отдельным rolldown-babel плагином с пресетом из
      // самого plugin-react. Workspace-пакеты (@jalyk/studio, @jalyk/ui) экспортируют
      // сырой src и резолвятся в реальные пути вне node_modules, поэтому фильтр
      // пресета (по умолчанию — все файлы вне node_modules) покрывает и их.
      babel({ presets: [reactCompilerPreset()] }),
    ],
  }
})
