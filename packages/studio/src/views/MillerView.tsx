import { useNavStack } from '../data/navigation.tsx'

/** Дефолтный вид студии — колонки в стиле miller (как Sanity): сегменты стека рисуются слева направо. Стек и его восстановление живут в навигации (useNavStack), здесь — только раскладка. */
export function MillerView() {
  const stack = useNavStack()

  return (
    <div className="flex h-full min-h-0 w-full overflow-x-scroll overflow-y-hidden">
      {stack.map((segment) => (
        <div key={segment.key} className="contents">
          {segment.node}
        </div>
      ))}
    </div>
  )
}
