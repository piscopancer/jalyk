import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return {
    entry: ['index.ts'],
    format: 'esm',
    dts: true,
    watch: options.watch,
  }
})
