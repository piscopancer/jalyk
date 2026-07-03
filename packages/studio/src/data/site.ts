// Центральные адреса платформы Jalyk. Студия встраивается в чужие приложения и
// по модели Sanity сама знает, куда обращаться: клиентскому сайту достаточно
// передать projectId и api-ключ, а apiUrl/authUrl студия берёт отсюда. Пропы
// Studio.apiUrl/authUrl перекрывают эти значения для локальной разработки
// (web :3000 / api :3001) и self-host.
//
// Сами боевые адреса — это дефолты ниже. Их можно переопределить на этапе сборки
// потребителя переменными VITE_JALYK_AUTH_URL / VITE_JALYK_API_URL, не трогая код:
// например, при переезде на собственный домен задать их в окружении сборки.

/** Боевой домен сайта-платформы Jalyk (apps/web — ЛК и вход через OAuth). На него
 * студия уводит редактора за bearer-токеном; совпадает с BETTER_AUTH_URL web. */
export const JALYK_SITE_URL =
  import.meta.env?.VITE_JALYK_AUTH_URL ?? 'https://jalyk.vercel.app'

/** Боевой адрес apps/api (контент документов, ассеты, поток событий, presence). */
export const JALYK_API_URL =
  import.meta.env?.VITE_JALYK_API_URL ?? 'https://jalyk-api.onrender.com'

/** Страница со списком проектов в ЛК — куда отправляем пользователя, если проект по переданным projectId и ключу недоступен. */
export const JALYK_PROJECTS_URL = `${JALYK_SITE_URL}/projects`
