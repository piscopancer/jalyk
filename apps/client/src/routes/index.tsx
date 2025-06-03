import { Button } from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'
import { LucideBowArrow } from 'lucide-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  useEffect(() => {
    fetch('http://localhost:1488').then((res) => res.json().then(console.log))
  }, [])

  return (
    <div className='text-center'>
      <Button IconLeft={LucideBowArrow}>123</Button>
    </div>
  )
}
