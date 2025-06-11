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
          title: 'Имя',
          placeholder: 'Ангелируни',
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
