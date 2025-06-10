import { StudioConfig } from '@/config'
import { useParams } from 'react-router'
import Header from './header'

const documentId = 'eric'

export default function Studio({ config }: { config: StudioConfig }) {
  const { '*': catchall } = useParams<'*'>()

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
