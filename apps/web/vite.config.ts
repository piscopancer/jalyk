import babel from '@rolldown/plugin-babel'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig, loadEnv } from 'vite'

// Секреты (BETTER_AUTH_*, OAuth-креды) лежат в общем .env в корне монорепы.
// Vite сам по себе в process.env ничего не кладёт и видит только VITE_-префикс,
// а better-auth читает голый process.env на сервере — поэтому подгружаем все
// переменные из корня (префикс '') в process.env dev-сервера вручную.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, monorepoRoot, ''))
  return {
    server: { port: 3000, host: true },
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart(),
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
