import type { DocumentPreviewState } from '@jalyk/schema'
import { createContext, useContext } from 'react'

// Состояние документа для превью (черновик + замечания). Студия вычисляет его в строке списка и раздаёт двумя способами: пропом `state` компоненту превью и этим контекстом — чтобы дефолтные индикаторы и кастомные превью могли читать его через хук без проброса пропсов.

const empty: DocumentPreviewState = {
  hasDraft: false,
  issues: [],
  worst: null,
  hasError: false,
}

const PreviewStateContext = createContext<DocumentPreviewState>(empty)

/** Провайдер состояния документа для дерева превью: оборачивает компонент превью в строке списка. */
export const PreviewStateProvider = PreviewStateContext.Provider

/** Состояние документа в превью (есть ли черновик, замечания). Тот же объект, что приходит пропом `state`, — для индикаторов и кастомных превью, которым удобнее хук. */
export function useDocumentPreviewState() {
  return useContext(PreviewStateContext)
}
