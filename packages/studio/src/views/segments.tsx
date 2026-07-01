import {
  definePathSegment,
  type AnyPathSegment,
  type SegmentParams,
} from '../data/navigation.tsx'
import { DocumentEditor } from './DocumentEditor.tsx'
import { DocumentsColumn, TypesColumn } from './columns.tsx'

// Встроенное дерево сегментов студии: типы → документы выбранного типа → редактор
// документа. Тот самый дрилл-даун, что раньше был зашит в MillerView/LayerView,
// только теперь выражен через definePathSegment и потому персистится и
// восстанавливается. Потребитель может вплести свои сегменты в children или
// заменить корень целиком через <Studio navigation={{ root }}>.

/** Строковый params по ключу (звено next несёт params как unknown). */
function paramString(params: SegmentParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

/** Лист дерева: редактор конкретного документа. Удаление закрывает сегмент и возвращает к списку. */
const documentSegment = definePathSegment({
  key: 'document',
  title: 'Документ',
  params: (p: { type: string; docId: string }) => p,
  view: ({ params, close }) => (
    <div className="min-h-0 w-max min-w-[24rem] flex-1 overflow-hidden">
      <DocumentEditor id={params.docId} type={params.type} onDeleted={close} />
    </div>
  ),
})

// Рекурсия дерева: из документа можно открыть документ — поле ссылки в форме открывает сегмент связанного документа, и так по цепочке без предела. Присваиваем потомка после определения, потому что сегмент ссылается сам на себя.
;(documentSegment.children as Record<string, AnyPathSegment>).document =
  documentSegment

/** Список документов выбранного типа; выбор открывает сегмент документа. Экспортируется как строительный блок: потребитель кладёт его в children своего корня. */
export const documentsSegment = definePathSegment({
  key: 'documents',
  title: 'Документы',
  params: (p: { type: string }) => p,
  children: { document: documentSegment },
  view: ({ params, open, go, next }) => (
    <DocumentsColumn
      type={params.type}
      selected={
        next?.key === 'document' ? paramString(next.params, 'docId') : undefined
      }
      onSelect={(id) => go(open.document({ type: params.type, docId: id }))}
    />
  ),
})

/** Корень дефолтной навигации: колонка типов документов. Навигацию TypesColumn берёт из контекста сегмента сам. */
export const defaultRootSegment = definePathSegment({
  key: 'types',
  title: 'Типы',
  children: { documents: documentsSegment },
  view: () => <TypesColumn />,
})
