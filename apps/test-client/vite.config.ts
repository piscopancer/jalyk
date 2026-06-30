import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// Тестовое клиентское приложение для встраивания @jalyk/studio. Конфиг проекта
// (projectId, api-ключ, адрес api) берётся из VITE_JALYK_* — общий .env лежит в
// корне монорепы, поэтому envDir указываем туда.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))

// Опциональный локальный https (см. apps/web/vite.config.ts): при https-студии
// иначе нельзя звать api по http. Пути к сертификату — из HTTPS_CERT_FILE/KEY_FILE.
function devHttps(env: Record<string, string>) {
  const cert = env.HTTPS_CERT_FILE
  const key = env.HTTPS_KEY_FILE
  if (!cert || !key) return undefined
  return {
    cert: fs.readFileSync(path.resolve(monorepoRoot, cert)),
    key: fs.readFileSync(path.resolve(monorepoRoot, key)),
  }
}

export default defineConfig(({ mode }) => ({
  envDir: monorepoRoot,
  server: {
    port: 3002,
    host: true,
    https: devHttps(loadEnv(mode, monorepoRoot, '')),
  },
  // tanstackRouter должен идти перед плагином React: он генерирует routeTree.gen.ts
  // из файлов в src/routes.
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
    // React Compiler автоматически мемоизирует рендеры. В plugin-react v6 (oxc/
    // rolldown) старый способ `viteReact({ babel: { plugins: [...] } })` не
    // работает — babel-конвейера в плагине больше нет, и опция молча игнорируется.
    // Компилятор подключается отдельным rolldown-babel плагином с пресетом из
    // самого plugin-react. Workspace-пакеты (@jalyk/studio, @jalyk/ui) экспортируют
    // сырой src и резолвятся в реальные пути вне node_modules, поэтому фильтр
    // пресета (по умолчанию — все файлы вне node_modules) покрывает и их.
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
}))
