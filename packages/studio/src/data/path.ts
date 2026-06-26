// Утилиты доступа к значению draft по пути-массиву ключей (для массивов — строковый индекс), совместимы с серверным jsonb_set: пустой путь означает весь документ.

/** Прочитать значение по пути. undefined, если путь не существует. */
export function getAtPath(root: unknown, path: readonly string[]): unknown {
  let current: unknown = root
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/** Иммутабельно записать значение по пути, создавая недостающие узлы (как jsonb_set с create=true). Пустой путь заменяет корень целиком. Если текущий узел — массив, сегмент пути трактуется как индекс и массив сохраняется массивом (иначе запись по индексу превратила бы его в объект, ломая элементы массива). */
export function setAtPath(
  root: unknown,
  path: readonly string[],
  value: unknown,
): unknown {
  if (path.length === 0) return value
  const [head, ...rest] = path
  if (Array.isArray(root)) {
    const index = Number(head)
    const next = root.slice()
    next[index] = setAtPath(root[index], rest, value)
    return next
  }
  const base =
    root != null && typeof root === 'object'
      ? (root as Record<string, unknown>)
      : {}
  return { ...base, [head!]: setAtPath(base[head!], rest, value) }
}

/** Сравнение путей по значению. */
export function samePath(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i])
}

/** Глубокое сравнение JSON-значений, нечувствительное к порядку ключей в объектах. Нужно, чтобы распознать эхо собственной правки: значение проходит сериализацию контракта и может вернуться с переставленными ключами, поэтому сравнение по JSON.stringify ненадёжно. Работает только для сериализуемого JSON (вся модель данных такая): примитивы, массивы, простые объекты. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    const ak = Object.keys(ao)
    const bk = Object.keys(bo)
    if (ak.length !== bk.length) return false
    return ak.every((key) => key in bo && deepEqual(ao[key], bo[key]))
  }
  return false
}
