import { StudioConfig } from '@repo/studio'

export const studioConfig: StudioConfig = {
  projectId: 'la',
  schema: [
    {
      name: 'user',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
        {
          type: 'string',
          name: 'surname',
        },
        {
          type: 'number',
          name: 'age',
        },
      ],
    },
  ],
}
