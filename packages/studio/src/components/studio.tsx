import useStudioCtx from '@/hooks/use-project-ctx'
import { shopDefinition } from '@/test/shapes'
import { trpc } from '@/trpc'
import { cn } from '@/utils'
import { faker } from '@faker-js/faker'
import { Separator } from '@repo/ui'
import { LucidePlus, LucideSearch } from 'lucide-react'
import { ComponentProps, createContext, ReactNode, useContext } from 'react'
import { createPath, useNavigate, useParams } from 'react-router'
import DocumentView from './form/document-view'
import Header from './header'
import Preview from './preview'

export default function Studio() {
  // const wsRef = useRef<WebSocket>(null!)
  // const [clients, setClients] = useState<({ id: string } & ClientData)[]>([])
  const utils = trpc.useUtils()
  const { projectId } = useStudioCtx()
  const fieldUpdateSub = trpc.field.onFieldUpdate.useSubscription(
    { projectId },
    {
      onData(updatedField) {
        // console.log('field updated received', updatedField)
        utils.field.find.setData(
          {
            documentId: updatedField.documentId,
            path: updatedField.path,
          },
          { value: updatedField.value }
        )
      },
    }
  )

  return (
    <main className='studio flex flex-col'>
      <Header />
      {/* render only if path starts with that name of the tool (structure) */}
      <Structure />
    </main>
  )
}

function Structure() {
  const params = useParams<'*'>()
  const catchall = params['*']?.split('/') ?? []
  const [tool, ...segments] = catchall

  return (
    <>
      <pre>{catchall.join('/')}</pre>
      <SegmentView
        segment={{
          tool: tool!,
          segments,
          segmentDefinition: testStructure,
        }}
        className='grow overflow-x-scroll'
      />
      <footer>FOOTER FOR SOMETHING???</footer>
    </>
  )
}

type Next = Record<string, (id?: any) => Segment>

type Segment = {
  next?: Next
  content: (ui: Ui) => ReactNode
}

function defineSegment(seg: Segment) {
  return seg
}

export const testStructure = defineSegment({
  next: {
    shop2() {
      return defineSegment({
        content(ui) {
          return <DocumentView definition={shopDefinition} id='shop_123' />
        },
      })
    },
    shop(id) {
      return defineSegment({
        next: {
          users() {
            return defineSegment({
              next: {
                megaUser(id) {
                  return defineSegment({
                    content(ui) {
                      return 'this user is TAMERLAN ✈🏝'
                    },
                  })
                },
              },
              content(ui) {
                return (
                  <ul>
                    <ui.DocumentItem tag='megaUser' id='tamik' />
                    <ui.DocumentItems tag='megaUser' type='user' />
                  </ul>
                )
              },
            })
          },
        },
        content(ui) {
          return (
            <div>
              <ui.DocumentForm id={id} />
              <ui.DocumentItem tag='users' id='users' />
            </div>
          )
        },
      })
    },
  },
  content(ui) {
    return (
      <ul>
        <ui.DocumentItem tag='shop' id='shop_1' />
        <ui.Separator title='123' />
        <ui.DocumentItem tag='shop2' id='shop_2' />
      </ul>
    )
  },
})

// const Separator = (props: {title?:string}) =>
const DocumentItem = (props: { tag: string; id: string }) => {
  const ctx = useContext(segmentContext)
  const nextSegment = buildSegment(props.tag, props.id)

  return (
    // <DebugWrapper value={{ nextSegment, realSeg: ctx.nextSegment ?? null }}>
    <button
      onClick={() => {
        ctx.navigateToSegment(nextSegment)
      }}
      className='w-full rounded-xl'
    >
      <Preview
        preview={{
          title: props.id,
          subtitle: props.tag,
        }}
        className={cn(ctx.nextSegment === nextSegment ? 'outline-4 outline-zinc-500/50' : '')}
      />
    </button>
    // </DebugWrapper>
  )
}
const DocumentForm = (props: { id: string }) => <article>form for document: {props.id}</article>
const TEST_IDS = Array.from({ length: 6 }).map(() => faker.color.human() + '_' + faker.company.buzzNoun())
const DocumentItems = (props: { tag: string; type: string }) => {
  return (
    <article>
      <header className='flex mb-2'>
        <h1 className='mr-auto'>{props.type}</h1>
        <button>
          <LucidePlus />
        </button>
      </header>
      <div className='mb-2 hopper'>
        <input placeholder='Search for documents' className='bg-zinc-900 w-full pl-11 pr-4 py-2 rounded-xl placeholder:text-zinc-500 text-sm' />
        <LucideSearch className='stroke-zinc-500 size-5 self-center ml-3' />
      </div>
      <ul>
        {TEST_IDS.map((id) => (
          <li key={id}>
            <DocumentItem tag={props.tag} id={id} />
          </li>
        ))}
      </ul>
    </article>
  )
}

type Ui = typeof ui

const ui = {
  Separator: Separator,
  DocumentItem,
  DocumentItems,
  DocumentForm,
}

function buildSegment(tag: string, id?: string) {
  let seg = tag
  if (id) {
    seg += `;${id}`
  }
  return seg
}

function parseSegment(segment: string) {
  const [tag, id] = segment.split(';')
  if (!tag) {
    throw new Error('no tag')
  }
  return { tag, id }
}

const segmentContext = createContext<{ segment: string | undefined; navigateToSegment: (segment: string) => void; nextSegment: string | undefined }>(null!)

type SegmentProps = { segmentIndex?: number; segmentDefinition: Segment; segments: string[]; tool: string }

export function SegmentView({
  segment: {
    //
    segmentIndex = -1,
    segmentDefinition,
    segments,
    tool,
  },
  ...attr
}: {
  segment: SegmentProps
} & ComponentProps<'section'>) {
  const navigate = useNavigate()

  // if not present, it means we are at /structure and nothing has been selected
  const segment = segments[segmentIndex]

  const nextSegment = (() => {
    const nextSegment = segments[segmentIndex + 1]
    if (!nextSegment) return
    const { tag, id } = parseSegment(nextSegment)
    if (segmentDefinition.next && tag in segmentDefinition.next) {
      return segmentDefinition.next[tag]!(id)
    }
  })()

  function handleNavigate(to: string) {
    const prevSegments = segments.slice(0, Math.max(segmentIndex, 0))
    const path = createPath({
      pathname: [
        //
        '/studio',
        tool,
        ...prevSegments,
        segment,
        to,
      ]
        .filter(Boolean)
        .join('/'),
    })
    navigate(path)
  }

  return (
    <section {...attr} className={cn('flex group', attr.className)}>
      <main className={cn('min-w-[28ch] max-w-[28ch] p-2', 'border-r border-zinc-800')}>
        {/* <DebugWrapper value={{ segment: segment ?? '---' }}> */}
        <segmentContext.Provider
          value={{
            segment,
            nextSegment: segments[segmentIndex + 1],
            navigateToSegment: handleNavigate,
          }}
        >
          <segmentDefinition.content {...ui} />
        </segmentContext.Provider>
        {/* </DebugWrapper> */}
      </main>
      {nextSegment && (
        <SegmentView
          segment={{
            segmentIndex: segmentIndex + 1,
            tool,
            segments,
            segmentDefinition: nextSegment,
          }}
        />
      )}
    </section>
  )
}
