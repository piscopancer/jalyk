import { useState } from 'react'
import { DocumentEditor } from './DocumentEditor.tsx'
import { DocumentsColumn, TypesColumn } from './columns.tsx'

// Дефолтный вид студии — колонки в стиле miller (как Sanity): типы → документы →
// редактор, с дрилл-дауном слева направо. Состояние выбора держим локально; смена
// типа сбрасывает выбранный документ.
export function MillerView() {
  const [type, setType] = useState<string | undefined>(undefined)
  const [docId, setDocId] = useState<string | undefined>(undefined)

  return (
    <div className="flex h-full min-h-0 w-full">
      <TypesColumn
        selected={type}
        onSelect={(next) => {
          setType(next)
          setDocId(undefined)
        }}
      />
      {type ? <DocumentsColumn type={type} selected={docId} onSelect={setDocId} /> : null}
      <div className="min-w-0 flex-1 overflow-hidden">
        {type && docId ? (
          <DocumentEditor id={docId} type={type} onDeleted={() => setDocId(undefined)} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {type ? 'Выберите документ' : 'Выберите тип документа'}
          </div>
        )}
      </div>
    </div>
  )
}
