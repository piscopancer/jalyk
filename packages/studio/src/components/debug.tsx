import { PropsWithChildren } from 'react'
import { JsonValue } from 'type-fest'

export function Debug(props: PropsWithChildren<{ value: JsonValue | undefined }>) {
  return (
    <div className='border border-blue-900 rounded-md'>
      <pre className='text-blue-500 text-xs p-1 m-1 bg-blue-950/50 border border-blue-900/50 rounded-sm'>{JSON.stringify(props.value, null, 2)}</pre>
      {props.children}
    </div>
  )
}
