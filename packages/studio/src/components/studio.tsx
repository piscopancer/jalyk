import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { StudioConfig } from '../config'
import Header from './header'

const documentId = 'eric'

export default function Studio({ config }: { config: StudioConfig }) {
  const router = useRouter()
  // const userDocDef = config.schema[0]
  console.log('router from studio', router)

  // todo router just not working, but it should for page reloads and url state persistence [[...]]
  useEffect(() => {
    // router.navigate(`/`, {})
  }, [])

  return (
    <main>
      <Header />
      {/* <ul>
        {userDocDef.fields.map((def) => (
          <li key={def.name}>
            <Fieldset field={def} documentId={documentId} />
          </li>
        ))}
      </ul> */}
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
    </main>
  )
}
