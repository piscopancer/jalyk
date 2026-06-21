/** Структурное сравнение двух JSON-значений: нужно, чтобы отличить черновик от опубликованной версии независимо от порядка ключей (jsonb на сервере его не гарантирует), поэтому стабильный stringify не подходит. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null || typeof a !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false
    return a.every((item, i) => jsonEqual(item, b[i]))
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const keys = Object.keys(ao)
  if (keys.length !== Object.keys(bo).length) return false
  return keys.every((k) => k in bo && jsonEqual(ao[k], bo[k]))
}
