import { createClient } from '@jalyk/client'
import { config } from './studio-config.ts'

// Публичный клиент чтения опубликованного контента сайта-потребителя. projectId
// и ключ берутся из .env. Предпочитаем отдельный read-ключ VITE_JALYK_CONTENT_API_KEY,
// но если он не задан — откатываемся на студийный VITE_JALYK_API_KEY (write-ключ
// тоже даёт доступ к проекту, а значит и к чтению published).
const projectId = import.meta.env.VITE_JALYK_PROJECT_ID as string | undefined
const apiKey = (import.meta.env.VITE_JALYK_CONTENT_API_KEY ??
  import.meta.env.VITE_JALYK_API_KEY) as string | undefined

/** Базовый адрес /api; тот же, что у студии. Нужен и для ссылок на ассеты. */
export const apiUrl =
  (import.meta.env.VITE_JALYK_API_URL as string | undefined) ??
  'http://localhost:3001'

/** Клиент контента или null, если не заданы проект и read-ключ. */
export const content =
  projectId && apiKey
    ? createClient(config, { baseUrl: apiUrl, projectId, apiKey })
    : null
