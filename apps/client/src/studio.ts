import { StudioConfig, defineReference, defineString } from '@repo/studio'
import { LucideGlobe, LucideHeading1, LucideShoppingBasket, LucideUser2 } from 'lucide-react'

export const shopDefinition = {
  type: 'shop',
  icon: LucideShoppingBasket,
  fields: {
    title: defineString({
      icon: LucideHeading1,
      title: 'Title',
    }),
    director: defineReference({
      icon: LucideUser2,
      title: 'Directorrr',
      options: {
        size: 'default',
      },
    }),
    location: defineString({
      options: {
        placeholder: 'Country',
        predefined: {
          display: 'dropdown',
          options: [
            { value: 'russia', title: 'Russia', icon: LucideGlobe },
            { value: 'moldova', title: 'Moldova', icon: LucideGlobe },
            { value: 'new-york', title: 'New York', icon: LucideGlobe },
          ],
        },
      },
    }),
  },
}

export const userDefinition = {
  type: 'user',
  icon: LucideUser2,
  fields: {
    name: defineString({}),
    surname: defineString({}),
    middlename: defineString({}),
  },
}

export const studioConfig: StudioConfig = {
  projectId: 'la',
  definitions: [shopDefinition, userDefinition],
}
