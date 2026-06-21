import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import { Api } from '@jalyk/contract'
import { Effect, ManagedRuntime } from 'effect'

// Слой данных студии: типизированный клиент HttpApi поверх fetch. Все вызовы — Effect, где слева union ошибок (NotFound/Forbidden/Unauthorized + транспортные), справа значение. react-query сверху отвечает за кэш и статусы (см. hooks.ts).

/** Рантайм с провайдером HttpClient на fetch. Один на экземпляр студии; через него гоняются эффекты клиента. ManagedRuntime, потому что слой нужно построить и держать живым на время жизни компонента. */
export const makeRuntime = () => ManagedRuntime.make(FetchHttpClient.layer)

export type StudioRuntime = ReturnType<typeof makeRuntime>

/** Строит клиент из общего контракта Api. baseUrl — адрес apps/api, ключ проекта добавляется в каждый запрос заголовком X-Api-Key (клиентский режим авторизации, см. middleware Authorization в @jalyk/contract). */
export const makeClient = (options: { apiUrl: string; apiKey: string }) =>
  HttpApiClient.make(Api, {
    baseUrl: options.apiUrl,
    transformClient: (client) =>
      client.pipe(
        HttpClient.mapRequest(
          HttpClientRequest.setHeader('x-api-key', options.apiKey),
        ),
      ),
  })

/** Тип построенного клиента (объект методов по группам/эндпоинтам Api). */
export type StudioApiClient = Effect.Effect.Success<
  ReturnType<typeof makeClient>
>
