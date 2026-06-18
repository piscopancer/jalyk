// Публичный вход @jalyk/studio.
export { Studio, type StudioProps } from './Studio.tsx'
// Дефолтные view и блоки — для композиции/частичного переопределения.
export { MillerView } from './views/MillerView.tsx'
export { ProjectGate } from './views/ProjectGate.tsx'
export { ProjectNotFound, type AccessDenial } from './views/ProjectNotFound.tsx'
export { JALYK_SITE_URL, JALYK_PROJECTS_URL } from './data/site.ts'
export { TypesColumn, DocumentsColumn } from './views/columns.tsx'
export { DefaultPreview } from './views/DefaultPreview.tsx'
export { DocumentEditor } from './views/DocumentEditor.tsx'
export { FieldInput } from './fields/FieldInput.tsx'
export { FieldMenu } from './fields/FieldMenu.tsx'
export {
  FieldClipboardProvider,
  useFieldClipboard,
  type ClipboardEntry,
  type FieldClipboardValue,
} from './data/clipboard.tsx'
export { StringField, NumberField, BooleanField, FallbackField } from './fields/defaults.tsx'
export { ImageField } from './fields/image.tsx'
export { ReferenceField } from './fields/reference.tsx'
export {
  FieldComponentsProvider,
  useFieldComponents,
  useFieldComponent,
  type FieldComponent,
  type FieldComponentProps,
  type FieldComponents,
} from './fields/registry.tsx'
export {
  StudioProvider,
  useStudio,
  type EventListener,
  type StudioContextValue,
  type StudioProviderProps,
  type UploadedAsset,
} from './data/context.tsx'
export { DocumentProvider, useDocumentContext, type DocumentContextValue } from './data/document.tsx'
export { StudioErrorProvider, useStudioErrors } from './data/error-context.tsx'
export { QueryError, normalizeError, errorToJson, type StudioError } from './data/errors.ts'
export { useField, type FieldHandle } from './data/field.ts'
export { useProjectEvents, useLiveInvalidation } from './data/events-hooks.ts'
export { studioKeys } from './data/keys.ts'
export { getAtPath, setAtPath, samePath } from './data/path.ts'
export {
  useDocuments,
  useDocument,
  useDocumentCounts,
  useCreateDocument,
  useSetField,
  usePublishDocument,
  useDeleteDocument,
  useSchemaSnapshot,
  usePutSchemaSnapshot,
  useUploadAsset,
} from './data/hooks.ts'
export type { StudioApiClient, StudioRuntime } from './data/runtime.ts'
