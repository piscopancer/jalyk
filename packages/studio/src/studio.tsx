import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import Fieldset from './components/form/fieldset'
import Header from './components/header'
import { StudioConfig, studioConfigCtx } from './config'
import { qc } from './query'

const documentId = 'eric'

export function Studio({ config }: { config: StudioConfig }) {
  const router = useRouter()
  const userDocDef = config.schema[0]

  return (
    <QueryClientProvider client={qc}>
      <studioConfigCtx.Provider value={config}>
        <Header />
        <ul>
          {userDocDef.fields.map((def) => (
            <li key={def.name}>
              <Fieldset field={def} documentId={documentId} />
            </li>
          ))}
        </ul>
        {/* <ul>
        {config.schema.map((docDef) => (
          <li key={docDef.name}>
            <button
              onClick={() => {
                router.navigate({
                  to: `/${docDef.name}`,
                })
              }}
            >
              {docDef.name}
            </button>
          </li>
        ))}
      </ul> */}
      </studioConfigCtx.Provider>
    </QueryClientProvider>
  )
}
