import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return {
    entry: ['index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    watch: options.watch,
  }
})
