import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
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
    // React Compiler автоматически мемоизирует рендеры; workspace-пакеты
    // (@jalyk/studio, @jalyk/ui) экспортируют сырой src и резолвятся в реальные
    // пути вне node_modules, поэтому Babel этого плагина покрывает и их.
    viteReact({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
    tailwindcss(),
  ],
})
