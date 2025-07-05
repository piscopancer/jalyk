import { AssetInput } from '@repo/studio'
import { createFileRoute } from '@tanstack/react-router'
import { filesize } from 'filesize'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className='m-12'>
      <AssetInput
        state={{
          type: 'empty',
          onChange: (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            console.log(filesize(file.size, { round: 0 }))
          },
        }}
      />
    </div>
  )
}
