import type { AnyField, FieldKind } from '@jalyk/schema'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

/** Реестр редакторов полей по виду (kind). Дефолтные редакторы можно переопределить композицией: либо пропом fieldComponents у <Studio>, либо обернув поддерево в <FieldComponentsProvider>. Каждый редактор получает путь к полю и его описание и сам берёт значение через useField(path). */
export type FieldComponentProps = {
  path: readonly string[]
  field: AnyField
  /** Значение есть, но не того типа/варианта при совпавшей категории (fit === 'type'): инпут показывает его «красным» и даёт починить выбором/перепечаткой. Структурный слом (категория) сюда не доходит — там рисуется аварийный редактор. */
  invalid?: boolean
}

export type FieldComponent = (props: FieldComponentProps) => ReactNode

export type FieldComponents = Partial<Record<FieldKind, FieldComponent>>

const FieldComponentsContext = createContext<FieldComponents>({})

export function useFieldComponents(): FieldComponents {
  return useContext(FieldComponentsContext)
}

/** Возвращает редактор для вида поля или undefined, если переопределения нет (тогда вызывающий рисует дефолт). */
export function useFieldComponent(kind: FieldKind): FieldComponent | undefined {
  return useFieldComponents()[kind]
}

/** Сливает переданные переопределения с унаследованными от родительского провайдера, чтобы вложенные провайдеры дополняли, а не затирали карту. */
export function FieldComponentsProvider({
  components,
  children,
}: {
  components: FieldComponents
  children: ReactNode
}) {
  const inherited = useFieldComponents()
  const merged = useMemo(
    () => ({ ...inherited, ...components }),
    [inherited, components],
  )
  return (
    <FieldComponentsContext.Provider value={merged}>
      {children}
    </FieldComponentsContext.Provider>
  )
}
