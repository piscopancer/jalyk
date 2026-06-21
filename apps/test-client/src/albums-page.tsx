import { useQuery } from '@tanstack/react-query'
import { Button, cn } from '@jalyk/ui'
import { useState } from 'react'
import { apiUrl, content } from './content-client.ts'
import { languages } from './studio-config.ts'

// Витрина опубликованных альбомов с треками — первый потребитель @jalyk/client.
// Запрос пишется типизированно: select задаёт джоины (band, tracks) и проекцию
// вложенных объектов (оригинальная лирика, переводы); результат выводится из него.

/** Загрузка вынесена в функцию, чтобы вывести тип одного альбома из результата запроса. */
const loadAlbums = (client: NonNullable<typeof content>) =>
  client.album.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      cover: true,
      band: {
        name: true,
      },
      tracks: {
        id: true,
        title: true,
        explicit: true,
        originalLyrics: true,
        lyrics: true,
      },
    },
  })

type Album = Awaited<ReturnType<typeof loadAlbums>>[number]
type Track = Album['tracks'][number]

/** Подпись языка по коду из реестра languages; фолбэк — сам код в верхнем регистре. */
const languageTitle = (code: string | null | undefined) =>
  languages.find((language) => language.value === code)?.title ??
  (code ? code.toUpperCase() : '—')

export function AlbumsPage() {
  const query = useQuery({
    queryKey: ['albums'],
    queryFn: () => (content ? loadAlbums(content) : Promise.resolve([])),
    enabled: !!content,
  })
  const albums: Album[] = query.data ?? []
  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null

  // Выбранный трек хранится по составному ключу (альбом + трек): один трек может
  // входить в несколько альбомов, поэтому ключ привязан к месту в списке.
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const trackKey = (albumId: string, track: Track) => `${albumId}:${track.id}`
  const selected = albums
    .flatMap((album) => album.tracks.map((track) => ({ album, track })))
    .find(({ album, track }) => trackKey(album.id, track) === selectedKey)

  if (!content)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Не задан проект</h1>
        <p className="mt-2 text-muted-foreground">
          Укажите в <code>.env</code> переменные{' '}
          <code>VITE_JALYK_PROJECT_ID</code> и ключ (
          <code>VITE_JALYK_CONTENT_API_KEY</code> или{' '}
          <code>VITE_JALYK_API_KEY</code>).
        </p>
      </div>
    )

  return (
    <div className="mx-auto grid h-full max-w-6xl grid-cols-2 gap-12 p-8">
      {/* Список альбомов: левая колонка центрированного блока. */}
      <section className="min-h-0 overflow-y-auto">
        <h1 className="text-2xl font-semibold">Альбомы</h1>
        {query.isPending && (
          <p className="mt-2 text-muted-foreground">Загрузка…</p>
        )}
        {error && <p className="mt-2 text-destructive">Ошибка: {error}</p>}
        {!error && !query.isPending && albums.length === 0 && (
          <p className="mt-2 text-muted-foreground">
            Пока нет опубликованных альбомов.
          </p>
        )}
        <ul className="mt-6 grid list-none gap-8 p-0">
          {albums.map((album) => (
            <li key={album.id} className="flex items-start gap-4">
              {album.cover?.assetId && (
                <img
                  src={`${apiUrl}/assets/${album.cover.assetId}`}
                  alt={album.title ?? ''}
                  className="size-24 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium">
                  {album.title ?? 'Без названия'}{' '}
                  {album.year != null && (
                    <span className="font-normal text-muted-foreground">
                      ({album.year})
                    </span>
                  )}
                </h2>
                {album.band?.name && (
                  <p className="mb-2 text-muted-foreground">
                    {album.band.name}
                  </p>
                )}
                <ol className="m-0 grid list-none gap-0.5 p-0">
                  {album.tracks.map((track, i) => {
                    const key = trackKey(album.id, track)
                    const isSelected = key === selectedKey
                    return (
                      <li key={track.id ?? i}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(key)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent',
                            isSelected && 'bg-accent font-medium',
                          )}
                        >
                          <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {track.title ?? 'Без названия'}
                          </span>
                          {track.explicit && (
                            <span
                              title="Ненормативный контент"
                              className="shrink-0 rounded-sm border px-1 text-[11px] leading-tight text-muted-foreground"
                            >
                              E
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Лирика выбранного трека: правая колонка, вкладки по языкам. */}
      <aside className="min-h-0 overflow-y-auto border-l pl-12">
        {selected ? (
          <LyricsPanel
            key={selectedKey}
            track={selected.track}
            albumTitle={selected.album.title}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground">
            <p>Выберите песню слева, чтобы прочитать текст и переводы.</p>
          </div>
        )}
      </aside>
    </div>
  )
}

/** Панель лирики: вкладка «Оригинал» и по вкладке на каждый перевод. */
function LyricsPanel({
  track,
  albumTitle,
}: {
  track: Track
  albumTitle: Album['title']
}) {
  const original = track.originalLyrics
  const translations = track.lyrics ?? []
  // Вкладки: оригинал (если есть текст) + переводы. tab='original' | индекс перевода.
  const tabs = [
    ...(original?.text ? [{ id: 'original' as const }] : []),
    ...translations.map((_, i) => ({ id: i })),
  ]
  const [tab, setTab] = useState<'original' | number>(tabs[0]?.id ?? 'original')

  return (
    <div>
      <header>
        <h2 className="text-xl font-semibold">
          {track.title ?? 'Без названия'}
        </h2>
        {albumTitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{albumTitle}</p>
        )}
      </header>

      {tabs.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Текст пока не добавлен.</p>
      ) : (
        <>
          <nav className="mt-4 flex flex-wrap gap-1 border-b pb-2">
            {original?.text && (
              <Button
                variant={tab === 'original' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTab('original')}
              >
                Оригинал
                <span className="ml-1 text-muted-foreground">
                  {languageTitle(original.language)}
                </span>
              </Button>
            )}
            {translations.map((translation, i) => (
              <Button
                key={i}
                variant={tab === i ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTab(i)}
              >
                {languageTitle(translation.language)}
              </Button>
            ))}
          </nav>

          <div className="mt-4">
            {tab === 'original' && original ? (
              <LyricsText
                text={original.text}
                byline={
                  original.authors && original.authors.length > 0
                    ? `Авторы: ${original.authors.join(', ')}`
                    : null
                }
              />
            ) : typeof tab === 'number' && translations[tab] ? (
              <LyricsText
                text={translations[tab].text}
                byline={
                  translations[tab].translator
                    ? `Перевод: ${translations[tab].translator}`
                    : null
                }
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

/** Текст лирики с переносами строк и опциональной подписью (авторы/переводчик). */
function LyricsText({
  text,
  byline,
}: {
  text: string | null | undefined
  byline: string | null
}) {
  if (!text) return <p className="text-muted-foreground">Текст не добавлен.</p>
  return (
    <div>
      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
      {byline && <p className="mt-4 text-sm text-muted-foreground">{byline}</p>}
    </div>
  )
}
