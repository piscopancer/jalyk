import { cn } from '@jalyk/ui'
import type { ReactNode } from 'react'
import { useNavStack } from '../data/navigation.tsx'

// Слоевой вид студии: тот же стек сегментов, что и в MillerView, но сегменты не растягиваются вправо со скроллом, а накладываются друг на друга как стопка (американские блинчики / стек тостеров shadcn). Каждый следующий сегмент сдвинут вправо на фиксированный шаг и лежит поверх предыдущих; глубокие слои угасают, а уйдя за предел видимости — убираются совсем.

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

/** Слоевой лейаут студии (альтернатива MillerView): сегменты стека стопкой со сдвигом и угасанием. */
export function LayerView() {
  const stack = useNavStack()
  return <LayerStack layers={stack} />
}
