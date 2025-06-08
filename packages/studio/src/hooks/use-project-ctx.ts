import { useContext } from 'react'
import { studioConfigCtx } from '../config'

export default function useStudioCtx() {
  return useContext(studioConfigCtx)
}
