import { cn } from '@jalyk/ui'
import { ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { useDocument } from '../data/hooks.ts'

// Интерактивный просмотр черновика документа — «наполовину JSON»: объекты и
// массивы сворачиваются, а ссылка (reference) — это вложенный блок, который при
// раскрытии лениво подгружает черновик связанного документа (его рисует тот же
// рекурсивный узел). Только чтение; форму draft диктует клиентская схема.

/** Значение-ссылка студии: id связанного документа и тип-цель. */
type Reference = { _ref: string; _toType: string }

function isReference(value: unknown): value is Reference {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)._ref === 'string' &&
    typeof (value as Record<string, unknown>)._toType === 'string'
  )
}

/** Кнопка-стрелка сворачивания; поворачивается на открытом узле. */
function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 rounded-sm hover:bg-accent">
      <ChevronRightIcon className={cn('size-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
      {children}
    </button>
  )
}

/** Подпись ключа/индекса слева от значения. */
function Key({ name }: { name: string }) {
  return <span className="text-muted-foreground">{name}:</span>
}

/** Примитив: строка в кавычках, число/булево/null с приглушением. */
function Primitive({ value }: { value: unknown }) {
  if (typeof value === 'string') return <span className="text-green-700 dark:text-green-400">"{value}"</span>
  if (value === null || value === undefined) return <span className="text-muted-foreground">null</span>
  return <span className="text-blue-700 dark:text-blue-400">{String(value)}</span>
}

/** Тело ссылки: лениво смонтировано только при раскрытии, поэтому запрос идёт по факту открытия. */
function ReferenceBody({ refId }: { refId: string }) {
  const doc = useDocument(refId)
  if (doc.isLoading) return <span className="text-xs text-muted-foreground">Загрузка…</span>
  if (!doc.data) return <span className="text-xs text-destructive">Документ недоступен</span>
  return <JsonNode value={doc.data.draft} />
}

function ReferenceNode({ name, value }: { name?: string; value: Reference }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Toggle open={open} onClick={() => setOpen((o) => !o)}>
        {name !== undefined && <Key name={name} />}
        <span className="text-purple-700 dark:text-purple-400">{value._toType}</span>
        <span className="text-muted-foreground">→ {value._ref}</span>
      </Toggle>
      {open && (
        <div className="ml-3 border-l pl-3">
          <ReferenceBody refId={value._ref} />
        </div>
      )}
    </div>
  )
}

function BranchNode({ name, entries, brackets }: { name?: string; entries: [string, unknown][]; brackets: [string, string] }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Toggle open={open} onClick={() => setOpen((o) => !o)}>
        {name !== undefined && <Key name={name} />}
        <span className="text-muted-foreground">
          {brackets[0]}
          {!open && `${entries.length}`}
          {!open && brackets[1]}
        </span>
      </Toggle>
      {open && (
        <div className="ml-3 border-l pl-3">
          {entries.length === 0 ? (
            <span className="text-muted-foreground">{brackets[0] + brackets[1]}</span>
          ) : (
            entries.map(([key, child]) => <JsonNode key={key} name={key} value={child} />)
          )}
        </div>
      )}
    </div>
  )
}

/** Узел дерева: ссылка → ReferenceNode, массив/объект → сворачиваемая ветка, иначе примитив. */
function JsonNode({ name, value }: { name?: string; value: unknown }) {
  if (isReference(value)) return <ReferenceNode name={name} value={value} />
  if (Array.isArray(value)) {
    return <BranchNode name={name} brackets={['[', ']']} entries={value.map((v, i) => [String(i), v])} />
  }
  if (typeof value === 'object' && value !== null) {
    return <BranchNode name={name} brackets={['{', '}']} entries={Object.entries(value as Record<string, unknown>)} />
  }
  return (
    <div className="flex gap-1">
      {name !== undefined && <Key name={name} />}
      <Primitive value={value} />
    </div>
  )
}

/** Корень просмотра черновика документа. */
export function DocumentJsonView({ draft }: { draft: unknown }) {
  return (
    <div className="overflow-auto font-mono text-xs leading-relaxed">
      <JsonNode value={draft} />
    </div>
  )
}
