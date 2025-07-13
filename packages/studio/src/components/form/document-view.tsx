import { DocumentDefinition } from '@/structure'
import { objectEntries } from '@/utils'
import { LucideEllipsis } from 'lucide-react'
import Fieldset from './fieldset'

export default function DocumentView({ documentId, documentDefinition }: { documentId: string; documentDefinition: DocumentDefinition }) {
  return (
    <article>
      <header className='flex bg-zinc-900'>
        <div className='mr-auto flex items-center'>
          {documentDefinition.icon && <documentDefinition.icon className='size-5 mr-2' />}
          <h1 className='inline mr-2'>{documentId}</h1>
          <span className='inline text-zinc-500 font-mono'>{documentDefinition.type}</span>
        </div>
        <menu>
          <button>
            <LucideEllipsis />
          </button>
        </menu>
      </header>
      <ul className='flex flex-col gap-6'>
        {objectEntries(documentDefinition.fields).map(([fieldName, config]) => (
          <li key={fieldName}>
            <Fieldset
              document={{
                id: documentId,
                type: documentDefinition.type,
              }}
              fieldName={fieldName}
              field={config}
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
