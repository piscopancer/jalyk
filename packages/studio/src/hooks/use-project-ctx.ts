import { studioConfigCtx } from '@/config'
import { useContext } from 'react'

export default function useStudioCtx() {
  return useContext(studioConfigCtx)
}
