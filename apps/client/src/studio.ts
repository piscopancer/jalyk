import { StudioConfig } from '@repo/studio'

// todo: move schema here
export const studioConfig: StudioConfig = {
  projectId: 'la',
  definitions: [
    
  ]
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
