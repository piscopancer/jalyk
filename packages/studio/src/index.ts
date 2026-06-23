// Публичный вход @jalyk/studio.
export { Studio, type StudioProps, type StudioLayout } from './Studio.tsx'
// Дефолтные view и блоки — для композиции/частичного переопределения.
export { MillerView } from './views/MillerView.tsx'
export { LayerView } from './views/LayerView.tsx'
export { Toolbar } from './views/Toolbar.tsx'
export { Avatar, OnlineUsers } from './views/Presence.tsx'
export { SettingsDialog } from './views/SettingsDialog.tsx'
export { usePresence, colorFromId, type PresenceUser } from './data/presence.ts'
export {
  StudioPrefsProvider,
  useStudioLayout,
  useStudioThemePref,
  type ThemePref,
} from './data/prefs.tsx'
export { StudioThemeProvider, useStudioDark } from './data/theme.tsx'
export { ProjectGate } from './views/ProjectGate.tsx'
export { ProjectNotFound, type AccessDenial } from './views/ProjectNotFound.tsx'
export { JALYK_SITE_URL, JALYK_PROJECTS_URL } from './data/site.ts'
export { TypesColumn, DocumentsColumn } from './views/columns.tsx'
export {
  DocumentList,
  DocumentRow,
  type DocumentListProps,
} from './views/DocumentList.tsx'
export { FilterBuilder } from './views/FilterBuilder.tsx'
export { SortMenu } from './views/SortMenu.tsx'
export {
  useListState,
  useFilterCount,
  emptyFilter,
  newGroup,
  newCond,
  nodeId,
  type ListState,
  type FilterNode,
  type FilterGroup,
  type FilterCond,
  type FilterRel,
  type RelQuantifier,
  type FilterOp,
  type SortState,
  type SortDir,
} from './data/list-state.ts'
export {
  compileFilterPredicate,
  gatherFilterTypes,
  relationTargets,
  matchesSearch,
  compareDocs,
  DATE_SORT_FIELDS,
  type EvalContext,
  type FilterPredicate,
} from './data/list-query.ts'
export { DefaultPreview } from './views/DefaultPreview.tsx'
export {
  DefaultDraftIndicator,
  DefaultIssueIndicators,
  DefaultPreviewIndicators,
} from './views/PreviewIndicators.tsx'
export {
  PreviewStateProvider,
  useDocumentPreviewState,
} from './data/preview-state.tsx'
export { DocumentEditor } from './views/DocumentEditor.tsx'
export { DocumentJsonView } from './views/DocumentJsonView.tsx'
export { IssueBadge } from './views/IssueBadge.tsx'
export {
  DocumentValidationProvider,
  useDocumentValidation,
  useFieldIssues,
  validateDraft,
  type DocumentValidation,
} from './data/validation.tsx'
export {
  CustomForm,
  type FormProps,
  type FormFieldProps,
  type FormFieldComponent,
} from './views/form.tsx'
export { FieldInput } from './fields/FieldInput.tsx'
export { FieldMenu } from './fields/FieldMenu.tsx'
export {
  FieldClipboardProvider,
  useFieldClipboard,
  type ClipboardEntry,
  type FieldClipboardValue,
} from './data/clipboard.tsx'
export {
  StringField,
  NumberField,
  BooleanField,
  FallbackField,
} from './fields/defaults.tsx'
export { ImageField } from './fields/image.tsx'
export { AssetField } from './fields/AssetField.tsx'
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
export {
  DocumentProvider,
  useDocumentContext,
  type DocumentContextValue,
} from './data/document.tsx'
export { StudioErrorProvider, useStudioErrors } from './data/error-context.tsx'
export {
  QueryError,
  normalizeError,
  errorToJson,
  type StudioError,
} from './data/errors.ts'
export { useField, type FieldHandle } from './data/field.ts'
export { useProjectEvents, useLiveInvalidation } from './data/events-hooks.ts'
export { studioKeys } from './data/keys.ts'
export { getAtPath, setAtPath, samePath } from './data/path.ts'
export {
  definePathSegment,
  PathSegmentLink,
  NavigationProvider,
  useNavStack,
  usePathSegmentNav,
  type PathSegment,
  type AnyPathSegment,
  type SegmentParams,
  type SegmentRenderContext,
  type OpenTarget,
  type PathEntry,
} from './data/navigation.tsx'
export { defaultRootSegment, documentsSegment } from './views/segments.tsx'
export {
  asIcon,
  asComponent,
  type IconComponent,
  type PreviewProps,
  type HeaderProps,
} from './data/react-bridge.tsx'
export {
  createStudio,
  createAsyncClient,
  type StudioClient,
  type StudioAsyncClient,
} from './data/createStudio.tsx'
export {
  useDocuments,
  useDocument,
  useDocumentCounts,
  useCreateDocument,
  useSetField,
  usePublishDocument,
  useResetDraft,
  useDeleteDocument,
  useSchemaSnapshot,
  usePutSchemaSnapshot,
  useUploadAsset,
  useAssetUsage,
} from './data/hooks.ts'
export type { StudioApiClient, StudioRuntime } from './data/runtime.ts'
