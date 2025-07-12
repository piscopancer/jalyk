import ReferenceFieldInput from '@/components/form/reference-input'
import { z } from 'zod/v4'

export default function TestPage() {
  return (
    <div className='m-12'>
      <ReferenceFieldInput
        reference={{
          docId: 'test_123',
          config: {
            options: {
              size: 'default',
            },
          },
          elementId: '_',
          fieldPath: 'test_path',
          shape: z.any(),
        }}
      />
    </div>
  )
}
