import { AssetInput, ClientData, WsEvent } from '@repo/studio'
import { createFileRoute } from '@tanstack/react-router'
import { filesize } from 'filesize'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const wsRef = useRef<WebSocket>(null!)
  const [clients, setClients] = useState<({ id: string } & ClientData)[]>([])

  useEffect(() => {
    // fetch('http://localhost:1488').then((res) => res.json().then(console.log))
    const ws = new WebSocket('ws://localhost:8000')
    wsRef.current = ws
    ws.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as WsEvent
      switch (event.type) {
        case 'clientConnected': {
          setClients((prev) => [
            ...prev,
            {
              id: event.id,
              name: event.client.name,
            },
          ])
          break
        }
        case 'clientDisconnected': {
          setClients((prev) => prev.filter((c) => c.id !== event.id))
          break
        }
      }
    }
  }, [])

  // const s = useQuery({
  //   queryKey: ['lol'],
  //   async queryFn() {
  //     return
  //   },
  // })

  // const m = useMutation({
  //   mutationKey: ['KEK'],
  //   async mutationFn() {
  //     return
  //   },
  // })

  return (
    <div className='m-12'>
      {/* <Button>{123}</Button> */}
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
    // <div className='text-center'>
    //   <Button IconLeft={LucideBowArrow}>button</Button>
    //   <p>clients</p>
    //   <ul>
    //     {clients.map((client) => (
    //       <li key={client.id} className='bg-zinc-900'>
    //         {client.name}
    //       </li>
    //     ))}
    //   </ul>
    // </div>
  )
}
