import { defineConfig } from 'tsdown'

// Сборка студии под публикацию. @jalyk/schema, @jalyk/ui и @jalyk/contract
// публикуются отдельными пакетами и остаются внешними зависимостями (declared в
// dependencies). Прочие npm-зависимости и react тоже внешние. CSS собирается
// отдельным шагом Tailwind CLI (см. скрипт build в package.json).
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: 'esm',
  dts: true,
  clean: true,
})
