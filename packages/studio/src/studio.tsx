// import { QueryClientProvider } from '@tanstack/react-query'
// import { createRouter, RouterProvider } from '@tanstack/react-router'
// import StudioComponent from './components/studio'
// import { StudioConfig, studioConfigCtx } from './config'
// import { qc } from './query'
// import { routeTree } from './routeTree.gen'

// const router = createRouter({
//   routeTree,
// })

// declare module '@tanstack/react-router' {
//   interface Register {
//     router: typeof router
//   }
// }

// export function Studio({ config }: { config: StudioConfig }) {
//   return (
//     // @ts-ignore
//     <RouterProvider router={router}>
//       <QueryClientProvider client={qc}>
//         <studioConfigCtx.Provider value={config}>
//           <StudioComponent config={config} />
//         </studioConfigCtx.Provider>
//       </QueryClientProvider>
//     </RouterProvider>
//   )
// }
