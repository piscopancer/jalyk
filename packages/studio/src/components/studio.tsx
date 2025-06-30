import { StudioConfig } from '@/config'
import { faker } from '@faker-js/faker'
import { LucidePlus } from 'lucide-react'
import { createContext, PropsWithChildren, ReactNode, useContext } from 'react'
import { createPath, useNavigate, useParams } from 'react-router'
import { JsonValue } from 'type-fest'
import Header from './header'
import Preview from './preview'

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

function Structure({}) {
  const params = useParams<'*'>()
  const catchall = params['*']?.split('/') ?? []
  const [tool, ...segments] = catchall

  return (
    <div>
      <pre>{catchall.join('/')}</pre>
      <SegmentView tool={tool!} segments={segments} segmentDefinition={testStructure} />
    </div>
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
          return 'TAMIK SIEL KAKASHKU'
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
          const ctx = useContext(segmentContext)

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
        <ui.Separator />
        <ui.DocumentItem tag='shop2' id='shop_2' />
      </ul>
    )
  },
})

const Separator = () => <div>---</div>
const DocumentItem = (props: { tag: string; id: string }) => {
  const ctx = useContext(segmentContext)

  return (
    <DebugWrapper value={buildSegment(props.tag, props.id)}>
      <button
        onClick={() => {
          const nextSegment = buildSegment(props.tag, props.id)
          ctx.navigateToSegment(nextSegment)
        }}
        className='w-full'
      >
        <Preview title={props.id} subtitle={props.tag} />
        {/* doc {props.id} */}
      </button>
    </DebugWrapper>
  )
}
const DocumentForm = (props: { id: string }) => <article>form for document: {props.id}</article>
const DocumentItems = (props: { tag: string; type: string }) => {
  const TEST_IDS = Array.from({ length: 6 }).map(() => faker.color.human() + '_' + faker.company.buzzNoun())
  return (
    <article>
      <header>
        <h1>{props.type}</h1>
        <button>
          <LucidePlus />
        </button>
      </header>
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
  Separator,
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

const segmentContext = createContext<{ segment: string | undefined; navigateToSegment: (segment: string) => void }>(null!)

export function SegmentView({ segmentIndex = -1, segmentDefinition, segments, tool }: { segmentIndex?: number; segmentDefinition: Segment; segments: string[]; tool: string }) {
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
    const path = createPath({
      pathname: [
        //
        '/studio',
        tool,
        ...segments.slice(0, Math.max(segmentIndex, 0)),
        segment,
        to,
      ]
        .filter(Boolean)
        .join('/'),
    })
    navigate(path)
  }

  return (
    <section className='flex'>
      <main className='min-w-[28ch] max-w-[28ch]'>
        <DebugWrapper value={{ segment: segment ?? '---' }}>
          <segmentContext.Provider
            value={{
              segment,
              navigateToSegment: handleNavigate,
            }}
          >
            <segmentDefinition.content {...ui} />
          </segmentContext.Provider>
        </DebugWrapper>
      </main>
      {nextSegment && <SegmentView segmentIndex={segmentIndex + 1} tool={tool} segments={segments} segmentDefinition={nextSegment} />}
    </section>
  )
}

function DebugWrapper(props: PropsWithChildren<{ value: JsonValue }>) {
  return (
    <div className='border border-zinc-800 rounded-md'>
      <pre className='text-zinc-500 text-xs p-1 m-1 bg-zinc-900 border border-zinc-700 rounded-sm'>{JSON.stringify(props.value, null, 2)}</pre>
      {props.children}
    </div>
  )
}
