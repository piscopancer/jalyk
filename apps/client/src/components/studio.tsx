import { projectConfig, projectConfigCtx } from '@/config'
import { useRouter } from '@tanstack/react-router'
import Fieldset from './studio/components/form/fieldset'
import Header from './studio/header'

const documentId = 'eric'

export function JalykStudio({ config }: { config: projectConfig }) {
  const router = useRouter()
  const userDocDef = config.schema[0]

  return (
    <projectConfigCtx.Provider value={config}>
      <Header />
      <ul>
        {userDocDef.fields.map((def) => (
          <li>
            <Fieldset field={def} />
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
    </projectConfigCtx.Provider>
  )
}
