import { defineConfig } from 'tsdown'

// Сборка пакета для публикации в реестр. Внутри монорепы потребители берут сырой
// src (поле exports), а dist собирается только под публикацию (publishConfig).
// @jalyk/schema остаётся внешней зависимостью (declared в dependencies) — не вшиваем.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  clean: true,
})
