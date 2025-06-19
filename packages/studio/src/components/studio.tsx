import { StudioConfig } from '@/config'
import { cn } from '@/utils'
import { useNavigate, useParams } from 'react-router'
import Header from './header'

// const documentId = 'eric'

export default function Studio({ config }: { config: StudioConfig }) {
  // const [projectId, ...restCatchall] = catchall

  return (
    <main>
      <Header />
      {/* render only if path starts with that name of the tool (structure) */}
      <Structure />
    </main>
  )
}

//

type StructureProps = {}

type DocumentType = 'shop' | 'employee'

function getChildSegment(child: Child) {
  if (child.type === 'separator') {
    return
  } else if (child.type === 'listItem') {
    return child.documentType
  } else if (child.type === 'documentItem') {
    return child.id
  }
}

type Child =
  | {
      title?: string
      type: 'separator'
      children: []
    }
  | {
      type: 'documentItem'
      id: string
      children: Child[]
    }
  | {
      type: 'documentForm'
      id: string
      children: []
    }
  | {
      type: 'listItem'
      documentType: DocumentType
      children: Child[]
    }
  | {
      type: 'list'
      documentType: DocumentType
      children: Child[]
    }

type Structure = {
  children: Child[]
}

const structure: Structure = {
  children: [
    {
      type: 'listItem',
      documentType: 'shop',
      children: [
        {
          type: 'list',
          documentType: 'shop',
          children: [],
        },
      ],
    },
    {
      type: 'listItem',
      documentType: 'employee',
      children: [
        {
          type: 'list',
          documentType: 'employee',
          children: [],
        },
      ],
    },
    {
      type: 'separator',
      children: [],
    },
    {
      type: 'documentItem',
      id: '123',
      children: [
        {
          children: [],
          type: 'documentForm',
          id: '123',
        },
      ],
    },
  ],
}

const documentIds = {
  shop: ['ptg_shop_1', 'ptg_shop_2'],
  employee: ['jarik', 'tamerlan', 'nikita'],
}

function Structure({}) {
  const params = useParams<'*'>()
  const catchall = params['*']?.split('/') ?? []
  const [tool, ...segments] = catchall

  return (
    <div>
      <pre>{catchall.join('/')}</pre>
      {/* render all selected, ok for array to be 0 */}
      <List children={structure.children} segments={segments} tool={tool} />
    </div>
  )
}

function List({ depth = 0, children, segments, tool }: { depth?: number; segments: string[]; children: Child[]; tool: string }) {
  const segment = segments[depth]
  const selectedChild = children.find((c) => getChildSegment(c) === segment)
  const nextChildren = selectedChild ? selectedChild.children : []

  const navigate = useNavigate()

  function onClick(segment: string) {
    navigate({
      pathname: ['/studio', tool, ...segments.slice(0, depth), segment].join('/'),
    })
  }

  return (
    <section className='flex gap-x-1'>
      <ul className='p-4 bg-zinc-900'>
        <pre className='text-xs text-zinc-500'>{JSON.stringify({ segment }, null, 2)}</pre>
        {children.map((item, i) => {
          if (item.type === 'listItem') {
            return (
              <li key={i} onClick={() => onClick(item.documentType)} className={cn(segment === item.documentType ? 'text-blue-500' : '')}>
                📚 {item.documentType}
              </li>
            )
          }
          if (item.type === 'list') {
            return (
              <div key={i}>
                <header>{item.documentType}</header>
                <ul className='px-4'>
                  {documentIds[item.documentType].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )
          }
          if (item.type === 'separator') {
            return <li key={i} className='border-b border-zinc-700 my-2' />
          }
          if (item.type === 'documentItem') {
            return (
              <li key={i} onClick={() => onClick(item.id)} className={cn(segment === item.id ? 'text-blue-500' : '')}>
                📄 {item.id}
              </li>
            )
          }
          if (item.type === 'documentForm') {
            return <DocumentForm key={i} documentId={item.id} />
          }
        })}
      </ul>
      {nextChildren.length > 0 && <List depth={depth + 1} children={nextChildren} segments={segments.slice(depth + 1)} tool={tool} />}
      {/* render suggested list */}
    </section>
  )
}

function DocumentForm({ documentId }: { documentId: string }) {
  return <p>DOCUMENT FORM FOR |{documentId}|</p>
}
