import { StudioConfig, defineDocument, defineQueryForDocument, defineReference, defineString } from '@repo/studio'
import { LucideGlobe, LucideHeading1, LucideInfo, LucideShoppingBasket, LucideUser2 } from 'lucide-react'

export const shopDefinition = defineDocument({
  type: 'shop',
  icon: LucideShoppingBasket,
  fields: {
    title: defineString({
      icon: LucideHeading1,
      title: 'Title',
    }),
    description: defineString({
      icon: LucideInfo,
      options: {
        input: {
          type: 'editor',
        },
      },
    }),
    director: defineReference({
      icon: LucideUser2,
      title: 'Directorrr',
      options: {
        size: 'default',
        to: ['employee'],
      },
    }),
    location: defineString({
      options: {
        placeholder: 'Country',
        input: {
          type: 'dropdown',
          predefined: [
            { value: 'russia', title: 'Russia', icon: LucideGlobe },
            { value: 'moldova', title: 'Moldova', icon: LucideGlobe },
            { value: 'new-york', title: 'New York', icon: LucideGlobe },
          ],
        },
      },
    }),
  },
})

const q = defineQueryForDocument({
  select: {},
})

export const userDefinition = defineDocument({
  type: 'user',
  icon: LucideUser2,
  fields: {
    name: defineString({}),
    surname: defineString({}),
    middlename: defineString({}),
  },
})

export const studioConfig: StudioConfig = {
  projectId: 'la',
  definitions: [shopDefinition, userDefinition],
}

declare module '@repo/studio' {
  interface CustomDocumentDefinitions {
    // wrong solution
    shop: { type: 'shop' }
    employee: { type: 'employee' }
  }
}
