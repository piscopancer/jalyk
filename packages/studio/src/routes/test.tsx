import ReferenceFieldInput from '@/components/form/reference-input'
import { referenceShape } from '@/structure'

export default function TestPage() {
  return (
    <div className='m-12'>
      <ReferenceFieldInput
        elementId='_'
        document={{
          id: 'test_123',
          type: 'user',
        }}
        field={{
          config: {
            options: {
              size: 'default',
            },
          },
          path: 'test_path',
          shape: referenceShape,
        }}
      />
    </div>
  )
}
