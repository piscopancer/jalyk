/** Статус правок и замечаний: ошибка, предупреждение, изменение (есть неопубликованный черновик). */
export type FieldStatus = 'error' | 'warning' | 'changed'

/** Общая палитра статусов: ошибка — красный (--destructive), предупреждение — жёлтый, изменение/черновик — светло-синий. Один источник цвета для полоски статуса поля и точек-индикаторов превью. */
export const statusColor = {
  error: 'var(--destructive)',
  warning: '#eab308',
  changed: '#38bdf8',
} as const satisfies Record<FieldStatus, string>
