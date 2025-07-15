import { useFieldUpdateSubscription } from '@/field'
import useStudioConfig from '@/hooks/use-project-ctx'
import { DocumentForPreview, useDefaultPreview, UsePreview, useUserPreview1 } from '@/preview'
import Assets from '@/routes/assets'
import { trpc } from '@/trpc'
import { cn, literalSwitch } from '@/utils'
import { Separator } from '@repo/ui'
import { LucideChevronRight, LucidePlus, LucideSearch } from 'lucide-react'
import { ComponentProps, createContext, ReactNode, useContext } from 'react'
import { createPath, useNavigate, useParams } from 'react-router'
import DocumentView from './form/document-view'
import Header from './header'
import { Preview } from './preview'

type Tool = 'structure' | 'assets'

export default function Studio() {
  const params = useParams<'*'>()
  const catchall = params['*']?.split('/') ?? []
  const [tool, ...segments] = catchall as [Tool, ...string[]]

  useFieldUpdateSubscription()

  return (
    <main className='studio flex flex-col bg-zinc-950'>
      <Header />
      {literalSwitch(tool, {
        assets: () => <Assets />,
        structure: () => <Structure segments={segments} />,
      })}
    </main>
  )
}

function Structure({ segments }: { segments: string[] }) {
  return (
    <>
      <SegmentView
        segment={{
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
    user() {
      return defineSegment({
        content(ui) {
          const { definitions } = useStudioConfig()
          return <DocumentView documentDefinition={definitions.find((d) => d.type === 'user')!} documentId='cool-user' />
        },
      })
    },
    shop() {
      return defineSegment({
        content(ui) {
          const { definitions } = useStudioConfig()
          return <DocumentView documentDefinition={definitions.find((d) => d.type === 'shop')!} documentId='shop_0' />
        },
      })
    },
    users() {
      return defineSegment({
        content(ui) {
          return <ui.DocumentItems tag='user' type='user' />
        },
        next: {
          user(id) {
            return defineSegment({
              content(ui) {
                return <ui.DocumentForm id={id} />
              },
            })
          },
        },
      })
    },
  },
  content(ui) {
    return (
      <ul>
        <ui.DocumentItem
          usePreview={useDefaultPreview}
          tag='shop'
          document={{
            id: 'shop_0',
            type: 'shop',
          }}
        />
        <ui.Separator />
        <ui.ToDocumentItems tag='users' type='user' />
        <ui.DocumentItem
          usePreview={useUserPreview1}
          tag='user'
          document={{
            id: 'cool-user',
            type: 'user',
          }}
        />
      </ul>
    )
  },
})

const DocumentItem = (props: {
  //
  document: DocumentForPreview
  tag: string
  usePreview: UsePreview
}) => {
  const ctx = useContext(segmentContext)
  const nextSegment = buildSegment(props.tag, props.document.id)
  return (
    <button
      onClick={() => {
        ctx.navigateToSegment(nextSegment)
      }}
      disabled={ctx.nextSegment === nextSegment}
      className={cn('border-y w-full', ctx.nextSegment === nextSegment ? 'border-zinc-800 bg-zinc-900' : 'border-transparent hover:bg-zinc-925')}
    >
      <Preview size='default' usePreview={props.usePreview} document={props.document} />
    </button>
  )
}
const DocumentForm = (props: { id: string }) => {
  const { definitions } = useStudioConfig()
  return (
    <article>
      <p>form for document: {props.id}</p>
      <DocumentView documentId={props.id} documentDefinition={definitions[1]!} />
    </article>
  )
}
const DocumentItems = (props: { tag: string; type: string }) => {
  const ctx = useContext(segmentContext)
  const documentIdsQuery = trpc.document.idsOfType.useQuery({ type: props.type })

  return (
    <article>
      <header className='flex mb-2'>
        <h1 className='mr-auto'>{props.type}</h1>
        <button
          onClick={() => {
            const randomId = '666'
            ctx.navigateToSegment(buildSegment(props.tag, randomId))
          }}
        >
          <LucidePlus />
        </button>
      </header>
      <div className='mb-2 hopper'>
        <input placeholder='Search for documents' className='bg-zinc-900 w-full pl-11 pr-4 py-2 rounded-xl placeholder:text-zinc-500 text-sm' />
        <LucideSearch className='stroke-zinc-500 size-5 self-center ml-3' />
      </div>
      <ul>
        {documentIdsQuery.data?.map(({ id }) => (
          <li key={id}>
            <DocumentItem tag={props.tag} document={{ id, type: props.type }} usePreview={useDefaultPreview} />
          </li>
        ))}
      </ul>
    </article>
  )
}
const ToDocumentItems = (props: { type: string; tag: string }) => {
  const ctx = useContext(segmentContext)
  const { definitions } = useStudioConfig()
  const def = definitions.find((d) => d.type === props.type)!
  const nextSegment = buildSegment(props.tag)
  const selected = ctx.nextSegment === nextSegment

  return (
    <button
      onClick={() => {
        ctx.navigateToSegment(buildSegment(props.tag))
      }}
      disabled={selected}
      className={cn('py-2 px-2 flex items-center w-full text-left', selected ? 'bg-zinc-900' : 'hover:bg-zinc-925')}
    >
      <div className='flex items-center gap-2 flex-1'>
        {def.icon && <def.icon className='size-5' />}
        <span>{def.title ?? def.type}</span>
      </div>
      <LucideChevronRight className='size-5' />
    </button>
  )
}

type Ui = typeof ui

const ui = {
  Separator,
  DocumentItem,
  DocumentItems,
  DocumentForm,
  ToDocumentItems,
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

type SegmentProps = {
  segmentIndex?: number
  segmentDefinition: Segment
  segments: string[]
}

export function SegmentView({
  segment: {
    //
    segmentIndex = -1,
    segmentDefinition,
    segments,
  },
  ...attr
}: {
  segment: SegmentProps
} & ComponentProps<'section'>) {
  const navigate = useNavigate()
  // const { studioPath } = useStudioConfig()

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
        // change to use studio config
        `/studio`,
        'structure' satisfies Tool,
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
      <main className={cn('min-w-[28ch] max-w-[28ch] flex')}>
        <segmentContext.Provider
          value={{
            segment,
            nextSegment: segments[segmentIndex + 1],
            navigateToSegment: handleNavigate,
          }}
        >
          <div className='flex-1'>
            <segmentDefinition.content {...ui} />
          </div>
        </segmentContext.Provider>
        {true && (
          <div className='h-full w-3 border-x border-zinc-800 px-1'>
            <div className='h-full bg-zinc-500/10' />
          </div>
        )}
      </main>
      {nextSegment && (
        <SegmentView
          segment={{
            segmentIndex: segmentIndex + 1,
            segments,
            segmentDefinition: nextSegment,
          }}
        />
      )}
    </section>
  )
}
