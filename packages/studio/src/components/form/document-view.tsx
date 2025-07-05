import { DocumentDefinition } from '@/test/shapes'
import { objectEntries } from '@/utils'
import { LucideEllipsis } from 'lucide-react'
import { z } from 'zod/v4'
import Fieldset from './fieldset'

export default function DocumentView(doc: { id: string; definition: DocumentDefinition }) {
  return (
    <article>
      <header className='flex bg-zinc-900'>
        <div className='mr-auto flex items-center'>
          {doc.definition.icon && <doc.definition.icon className='size-5 mr-2' />}
          <h1 className='inline mr-2'>{doc.id}</h1>
          <span className='inline text-zinc-500 font-mono'>{doc.definition.type}</span>
        </div>
        <menu>
          <button>
            <LucideEllipsis />
          </button>
        </menu>
      </header>
      <ul className='flex flex-col gap-6'>
        {objectEntries(doc.definition.fields).map(([fieldName, config]) => (
          <li key={fieldName}>
            <Fieldset
              fieldName={fieldName}
              documentId={doc.id}
              fieldConfig={config}
              shape={config.shape as unknown as z.ZodAny}
              toolbar={{
                title: config.title,
                icon: config.icon,
              }}
            />
          </li>
        ))}
      </ul>
    </article>
  )
}
