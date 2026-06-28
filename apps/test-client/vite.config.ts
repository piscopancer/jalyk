import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Тестовое клиентское приложение для встраивания @jalyk/studio. Конфиг проекта
// (projectId, api-ключ, адрес api) берётся из VITE_JALYK_* — общий .env лежит в
// корне монорепы, поэтому envDir указываем туда.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig({
  envDir: monorepoRoot,
  server: { port: 3002, host: true },
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
})
