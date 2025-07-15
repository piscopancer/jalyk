import { deleteAsset, listAssets, uploadProjectAsset as uploadAsset } from '@/s3'
import { z } from 'zod/v4'
import { t } from './t'

export const assetRouter = t.router({
  upload: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string(),
        data: z.string(),
      })
    )
    .mutation(({ input }) => {
      return uploadAsset(input.projectId, input.name, input.data)
    }),
  list: t.procedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(({ input }) => {
      return listAssets(input.projectId)
    }),
  delete: t.procedure.input(z.object({ project: z.string(), name: z.string() })).mutation(({ input }) => {
    return deleteAsset(input.project, input.name)
  }),
})
