import { cn } from '@jalyk/ui'
import { useState, type ReactNode } from 'react'
import { DocumentEditor } from './DocumentEditor.tsx'
import { DocumentsColumn, TypesColumn } from './columns.tsx'

// Слоевой вид студии: тот же дрилл-даун типы → документы → редактор, что и в MillerView, но сегменты не растягиваются вправо со скроллом, а накладываются друг на друга как стопка (американские блинчики / стек тостеров shadcn). Каждый следующий сегмент сдвинут вправо на фиксированный шаг и лежит поверх предыдущих; глубокие слои угасают, а уйдя за предел видимости — убираются совсем.

const LAYER_STEP = 44 // px, на сколько каждый следующий сегмент сдвинут вправо
const VISIBLE_LAYERS = 5 // глубже — слой на 100% прозрачности и не рисуется

type Layer = { key: string; node: ReactNode }

function LayerStack({ layers }: { layers: Layer[] }) {
  const top = layers.length - 1
  return (
    <div className="relative h-full w-full overflow-hidden">
      {layers.map((layer, i) => {
        const depth = top - i
        if (depth >= VISIBLE_LAYERS) return null
        return (
          <div
            key={layer.key}
            className={cn(
              'absolute inset-y-0 right-0 flex bg-background transition-all duration-200',
              i > 0 && 'border-l shadow-[-12px_0_24px_-12px_rgba(0,0,0,0.45)]',
            )}
            style={{
              left: i * LAYER_STEP,
              zIndex: i,
              opacity: 1 - depth / VISIBLE_LAYERS,
            }}
          >
            {layer.node}
          </div>
        )
      })}
    </div>
  )
}

/** Слоевой лейаут студии (альтернатива MillerView): сегменты стопкой со сдвигом и угасанием. */
export function LayerView() {
  const [type, setType] = useState<string | undefined>(undefined)
  const [docId, setDocId] = useState<string | undefined>(undefined)

  const layers: Layer[] = [
    {
      key: 'types',
      node: (
        <TypesColumn
          selected={type}
          onSelect={(next) => {
            setType(next)
            setDocId(undefined)
          }}
        />
      ),
    },
  ]
  if (type) {
    layers.push({
      key: `docs:${type}`,
      node: (
        <DocumentsColumn type={type} selected={docId} onSelect={setDocId} />
      ),
    })
  }
  if (type && docId) {
    layers.push({
      key: `editor:${docId}`,
      node: (
        <div className="min-w-0 flex-1">
          <DocumentEditor
            id={docId}
            type={type}
            onDeleted={() => setDocId(undefined)}
          />
        </div>
      ),
    })
  }

  return <LayerStack layers={layers} />
}
