// Утилиты доступа к значению draft по пути-массиву ключей (для массивов — строковый
// индекс), совместимы с серверным jsonb_set: пустой путь означает весь документ.

/** Прочитать значение по пути. undefined, если путь не существует. */
export function getAtPath(root: unknown, path: readonly string[]): unknown {
  let current: unknown = root
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/**
 * Иммутабельно записать значение по пути, создавая недостающие узлы (как jsonb_set
 * с create=true). Пустой путь заменяет корень целиком. Если текущий узел — массив,
 * сегмент пути трактуется как индекс и массив сохраняется массивом (иначе запись по
 * индексу превратила бы его в объект, ломая элементы массива).
 */
export function setAtPath(root: unknown, path: readonly string[], value: unknown): unknown {
  if (path.length === 0) return value
  const [head, ...rest] = path
  if (Array.isArray(root)) {
    const index = Number(head)
    const next = root.slice()
    next[index] = setAtPath(root[index], rest, value)
    return next
  }
  const base = root != null && typeof root === 'object' ? (root as Record<string, unknown>) : {}
  return { ...base, [head!]: setAtPath(base[head!], rest, value) }
}

/** Сравнение путей по значению. */
export function samePath(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i])
}
