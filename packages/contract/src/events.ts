// Типы событий проекта — общий контракт SSE-потока. Сервер (apps/api) публикует
// их в шину и сериализует в кадры text/event-stream; студия читает поток и
// разбирает кадры по этому же типу. На проводе это JSON в поле data кадра, схемой
// Effect не валидируется (поток сырой, handleRaw), поэтому здесь — TS-типы.

export type ProjectEvent =
  | {
      readonly kind: 'field'
      readonly docId: string
      readonly type: string
      readonly path: readonly string[]
      readonly value: unknown
    }
  | { readonly kind: 'create'; readonly docId: string; readonly type: string; readonly draft: unknown }
  | {
      readonly kind: 'publish'
      readonly docId: string
      readonly type: string
      readonly publishedAt: string
    }
  | { readonly kind: 'delete'; readonly docId: string; readonly type: string }

/** Вид события — совпадает с полем event: в SSE-кадре. */
export type ProjectEventKind = ProjectEvent['kind']
