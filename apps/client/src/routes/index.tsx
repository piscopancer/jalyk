import { JalykStudio } from '@/components/studio'
import { projectConfig } from '@/config'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

const config: projectConfig = {
  id: 'la',
  schema: [
    {
      name: 'user',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
        {
          type: 'number',
          name: 'age',
        },
      ],
    },
  ],
}

function App() {
  // const wsRef = useRef<WebSocket>(null!)
  // const [clients, setClients] = useState<({ id: ClientId } & ClientData)[]>([])

  // useEffect(() => {
  //   // fetch('http://localhost:1488').then((res) => res.json().then(console.log))
  //   const ws = new WebSocket('ws://localhost:8000')
  //   wsRef.current = ws
  //   ws.onmessage = (e: MessageEvent<string>) => {
  //     const event = JSON.parse(e.data) as WsEvent
  //     switch (event.type) {
  //       case 'clientConnected': {
  //         setClients((prev) => [
  //           ...prev,
  //           {
  //             id: event.id,
  //             name: event.client.name,
  //           },
  //         ])
  //         break
  //       }
  //       case 'clientDisconnected': {
  //         setClients((prev) => prev.filter((c) => c.id !== event.id))
  //         break
  //       }
  //     }
  //   }
  // }, [])

  return (
    <JalykStudio config={config} />
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
