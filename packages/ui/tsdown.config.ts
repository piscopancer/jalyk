import { defineConfig } from 'tsdown'

// Сборка пакета под публикацию. Внутри монорепы потребители берут сырой src
// (exports), dist собирается только для реестра (publishConfig). Два входа: главный
// и подпуть ./cn. Все npm-зависимости и react остаются внешними (declared в
// dependencies/peerDependencies) — не вшиваем. CSS собирается отдельным шагом
// Tailwind CLI (см. скрипт build в package.json), tsdown его не трогает.
export default defineConfig({
  entry: { index: 'src/index.ts', cn: 'src/lib/cn.ts' },
  format: 'esm',
  dts: true,
  clean: true,
})
