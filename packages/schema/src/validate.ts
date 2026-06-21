import { Brand, Either, Schema } from 'effect'
import type { ArrayIndex, FieldMap, FieldPath, PathBuilder } from './field.ts'

// Клиентская валидация документа целиком. Правила объявляются на уровне документа
// (defineDocument.validate) и видят весь типизированный черновик, поэтому могут
// сверять поля попарно. Строгость замечания — warning (можно сохранять, жёлтый
// значок) или error (нельзя публиковать, красный значок). Серверной проверки нет.

/** Строгость замечания: warning не блокирует публикацию, error блокирует. */
export type Severity = 'warning' | 'error'

/** Замечание валидации: строгость, текст и опц. путь к полю — для значка на нём. */
export type Issue = { severity: Severity; message: string; path?: FieldPath }

/** Общие настройки правила: строгость (по умолчанию error), свой текст и путь к полю из билдера path(...). */
export type IssueOptions = { severity?: Severity; message?: string; path?: FieldPath }

/** Конструктор брендированного индекса элемента массива: index(0) — для сегмента пути внутрь массива. */
export const index = Brand.nominal<ArrayIndex>()

const makeFieldPath = Brand.nominal<FieldPath>()

// Рантайм-билдер пути: сегменты приводятся к строкам (индекс → "i"), как адресует поля студия.
const buildPath = (segments: readonly (string | number)[]) => makeFieldPath(segments.map(String))

const makeIssue = (opts: IssueOptions | undefined, fallback: string): Issue => ({
  severity: opts?.severity ?? 'error',
  message: opts?.message ?? fallback,
  path: opts?.path,
})

/** Прогоняет значение через Effect-схему; провал декодирования → Issue, иначе null. */
// `any` в позиции Encoded: для decodeUnknown вход всегда unknown, кодируемый тип роли не играет.
function check<A>(value: unknown, schema: Schema.Schema<A, any, never>, opts: IssueOptions | undefined, fallback: string): Issue | null {
  return Either.isLeft(Schema.decodeUnknownEither(schema)(value)) ? makeIssue(opts, fallback) : null
}

const numberInRange = ({ min, max }: { min?: number; max?: number }) => {
  const lower = min === undefined ? Schema.Number : Schema.Number.pipe(Schema.greaterThanOrEqualTo(min))
  return max === undefined ? lower : lower.pipe(Schema.lessThanOrEqualTo(max))
}

const rangeMessage = ({ min, max }: { min?: number; max?: number }) =>
  min !== undefined && max !== undefined ? `От ${min} до ${max}` : min !== undefined ? `Не меньше ${min}` : `Не больше ${max}`

/** Встроенные проверки на Effect Schema. Каждая возвращает Issue или null. `schema` — эскейп под любую свою схему. */
export const rules = {
  /** Значение заполнено (не undefined/null/пустая строка/пустой массив). */
  required: (value: unknown, opts?: IssueOptions): Issue | null => {
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
    return empty ? makeIssue(opts, 'Обязательное поле') : null
  },
  minLength: (value: unknown, n: number, opts?: IssueOptions) => check(value, Schema.String.pipe(Schema.minLength(n)), opts, `Не короче ${n} символов`),
  maxLength: (value: unknown, n: number, opts?: IssueOptions) => check(value, Schema.String.pipe(Schema.maxLength(n)), opts, `Не длиннее ${n} символов`),
  pattern: (value: unknown, re: RegExp, opts?: IssueOptions) => check(value, Schema.String.pipe(Schema.pattern(re)), opts, 'Неверный формат'),
  minItems: (value: unknown, n: number, opts?: IssueOptions) => check(value, Schema.Array(Schema.Unknown).pipe(Schema.minItems(n)), opts, `Не меньше ${n} элементов`),
  maxItems: (value: unknown, n: number, opts?: IssueOptions) => check(value, Schema.Array(Schema.Unknown).pipe(Schema.maxItems(n)), opts, `Не больше ${n} элементов`),
  range: (value: unknown, bounds: { min?: number; max?: number }, opts?: IssueOptions) => check(value, numberInRange(bounds), opts, rangeMessage(bounds)),
  schema: <A>(value: unknown, schema: Schema.Schema<A, any, never>, opts?: IssueOptions) => check(value, schema, opts, 'Неверное значение'),
}

/** Результат правила: Issue либо «нет замечания» (null/undefined/false) — чтобы писать условия инлайн. */
export type RuleResult = Issue | null | undefined | false

/** Функция-валидатор документа: видит весь типизированный черновик и строгий билдер path, возвращает замечания. */
export type DocumentValidate<Draft, F extends FieldMap> = (doc: Draft, path: PathBuilder<F>) => readonly RuleResult[]

/** Рантайм-тип валидатора (черновик и билдер стёрты), как ErasedComponent — `never` делает подтипом любой DocumentValidate. */
export type ErasedValidate = (doc: never, path: never) => readonly RuleResult[]

/** Запускает валидатор документа на черновике, передавая рантайм-билдер пути, и отбрасывает пустые результаты. */
export function runValidate(validate: ErasedValidate, draft: unknown): Issue[] {
  // Валидатор объявлен со стёртыми `never`-аргументами; вызываем реальным черновиком и билдером.
  const issues = (validate as (doc: unknown, path: typeof buildPath) => readonly RuleResult[])(draft, buildPath)
  return issues.filter((issue): issue is Issue => Boolean(issue))
}

/** Худшая строгость в списке замечаний: error важнее warning, иначе null. */
export function worstSeverity(issues: readonly Issue[]): Severity | null {
  if (issues.some((i) => i.severity === 'error')) return 'error'
  if (issues.length > 0) return 'warning'
  return null
}
