import { useAtom, type PrimitiveAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { StudioLayout } from '../Studio.tsx'

// Пользовательские настройки студии (лейаут и тема), персистятся в localStorage
// через atomWithStorage — той же связкой jotai, что и состояние списков (см.
// list-state.ts). Атомы создаются на проект: ключ версионируется и включает
// projectId, чтобы настройки разных проектов не пересекались. Дефолт лейаута
// приходит из пропа <Studio layout>, тема по умолчанию следует за системной.

/** Предпочтение темы: следовать системной либо принудительно светлая/тёмная. */
export type ThemePref = 'system' | 'light' | 'dark'

/** Вид галереи ассетов: сетка плиток или список строк. */
export type AssetView = 'grid' | 'list'

type PrefsValue = {
  layoutAtom: PrimitiveAtom<StudioLayout>
  themeAtom: PrimitiveAtom<ThemePref>
  assetViewAtom: PrimitiveAtom<AssetView>
}

const PrefsContext = createContext<PrefsValue | null>(null)

function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) {
    throw new Error(
      'useStudio*Pref должен вызываться внутри <StudioPrefsProvider>',
    )
  }
  return ctx
}

export function StudioPrefsProvider({
  projectId,
  defaultLayout,
  children,
}: {
  projectId: string
  defaultLayout: StudioLayout
  children: ReactNode
}) {
  const layoutAtom = useMemo(
    () =>
      atomWithStorage<StudioLayout>(
        `jalyk:studio:v1:${projectId}:layout`,
        defaultLayout,
      ),
    [projectId, defaultLayout],
  )
  const themeAtom = useMemo(
    () =>
      atomWithStorage<ThemePref>(
        `jalyk:studio:v1:${projectId}:theme`,
        'system',
      ),
    [projectId],
  )
  const assetViewAtom = useMemo(
    () =>
      atomWithStorage<AssetView>(
        `jalyk:studio:v1:${projectId}:asset-view`,
        'grid',
      ),
    [projectId],
  )
  const value = useMemo<PrefsValue>(
    () => ({ layoutAtom, themeAtom, assetViewAtom }),
    [layoutAtom, themeAtom, assetViewAtom],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

/** Текущий лейаут студии и сеттер; персистится в localStorage. */
export function useStudioLayout() {
  return useAtom(usePrefs().layoutAtom)
}

/** Текущее предпочтение темы и сеттер; персистится в localStorage. */
export function useStudioThemePref() {
  return useAtom(usePrefs().themeAtom)
}

/** Текущий вид галереи ассетов (сетка/список) и сеттер; персистится в localStorage. */
export function useStudioAssetView() {
  return useAtom(usePrefs().assetViewAtom)
}
