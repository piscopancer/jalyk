import { definePathSegment, type SegmentParams } from '../data/navigation.tsx'
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
  params: (p: { type: string; docId: string }) => p,
  view: ({ params, close }) => (
    <div className="min-w-0 flex-1 overflow-hidden">
      <DocumentEditor id={params.docId} type={params.type} onDeleted={close} />
    </div>
  ),
})

/** Список документов выбранного типа; выбор открывает сегмент документа. Экспортируется как строительный блок: потребитель кладёт его в children своего корня. */
export const documentsSegment = definePathSegment({
  key: 'documents',
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

/** Корень дефолтной навигации: колонка типов документов. */
export const defaultRootSegment = definePathSegment({
  key: 'types',
  children: { documents: documentsSegment },
  view: ({ open, go, next }) => (
    <TypesColumn
      selected={
        next?.key === 'documents'
          ? paramString(next.params, 'type')
          : undefined
      }
      onSelect={(type) => go(open.documents({ type }))}
    />
  ),
})
