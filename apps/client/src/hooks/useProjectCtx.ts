import { projectConfigCtx } from '@/config'
import { useContext } from 'react'

export default function useProjectCtx() {
  return useContext(projectConfigCtx)
}
