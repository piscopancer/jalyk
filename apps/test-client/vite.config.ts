import tailwindcss from '@tailwindcss/vite'
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
  plugins: [viteReact(), tailwindcss()],
})
