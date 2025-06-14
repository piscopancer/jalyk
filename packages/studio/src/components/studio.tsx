import { StudioConfig } from '@/config'
import { trpc } from '@/trpc'
import { useParams } from 'react-router'
import Fieldset from './form/fieldset'
import Header from './header'

const documentId = 'eric'

export default function Studio({ config }: { config: StudioConfig }) {
  const params = useParams<'*'>()
  const catchall = params['*']?.split('/') ?? []
  const [projectId, ...restCatchall] = catchall
  const userDocDef = config.schema[0]
  const createUserMutation = trpc.user.create.useMutation()

  return (
    <main>
      <Header />
      <ul className='mx-auto w-xl gap-6 flex flex-col'>
        {userDocDef.fields.map((def) => (
          <li key={def.name}>
            <Fieldset field={def} documentId={documentId} />
          </li>
        ))}
      </ul>
      <button
        onClick={async () => {
          const res = await createUserMutation.mutateAsync({
            email: '',
          })
          console.log(res)
        }}
      >
        create
      </button>
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
