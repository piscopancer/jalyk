import { useEffect, useState } from 'react'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

import { cn } from '../../lib/cn.ts'

/** Подсветка кода через Shiki на JS-движке регулярок (createJavaScriptRegexEngine), без Oniguruma/WASM. Темы как у shadcn: github-light/github-dark, двойной режим (defaultColor: false) выводит на токенах --shiki-dark, активируемый под `.dark`. Highlighter создаётся один раз и кешируется на модуле; грамматики и темы тянутся динамическими импортами, поэтому в основной бандл почти ничего не добавляется. */
let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ],
      langs: [import('shiki/langs/json.mjs')],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

function CodeBlock({
  code,
  lang = 'json',
  className,
}: {
  code: string
  lang?: string
  className?: string
}) {
  // До готовности highlighter'а (и при сбое) показываем обычный pre с тем же оформлением, чтобы не было скачка макета и текст всегда был читаем.
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getHighlighter()
      .then((highlighter) => {
        if (!active) return
        setHtml(
          highlighter.codeToHtml(code, {
            lang,
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          }),
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [code, lang])

  if (html === null) {
    return (
      <pre
        data-slot="code-block"
        className={cn(
          'thin-scrollbar overflow-auto font-mono text-xs',
          className,
        )}
      >
        {code}
      </pre>
    )
  }

  return (
    <div
      data-slot="code-block"
      className={cn(
          'thin-scrollbar overflow-auto font-mono text-xs',
          className,
        )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export { CodeBlock }
