import { DocumentDefinition, FieldDefinition } from '@/structure'
import { QueryClient } from '@tanstack/react-query'
import { Paths } from 'type-fest'
import { z } from 'zod/v4'

export const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
    },
  },
})

export const queryKeys = {
  users: (projectId: string) => [projectId, 'users'],
} as const

export interface CustomDocumentDefinitions {
  // [key: string]: DocumentDefinition
}
export type CustomDocumentDefinition = CustomDocumentDefinitions[keyof CustomDocumentDefinitions]
export type CustomDocumentDefinitionType = CustomDocumentDefinition['type']

const field = {
  guy: {
    tall: true,
  },
  director: {
    name: 'John',
    surname: 'Jarimasov',
  },
  // company: {
  //   guy: {
  //     tall: true,
  //   },
  //   director: {
  //     name: 'John',
  //     surname: 'Jarimasov',
  //   },
  //   employees: [
  //     {
  //       name: 'Tamik',
  //       surname: 'Bebrov',
  //       age: 12,
  //     },
  //     {
  //       name: 'Bard',
  //       surname: 'Goydov',
  //     },
  //   ],
  // },
}

type TuplifyPath<P extends string> = P extends `${infer Left}.${infer Right}`
  ? [Left extends `${infer N extends number}` ? N : Left, ...TuplifyPath<Right>]
  : P extends `${infer N extends number}`
    ? [N]
    : [P]

const fieldPath: FieldPath = ['guy', 'tall']

type FieldPaths = Paths<typeof field>
// cannot end tuple at array index
type FieldPath = TuplifyPath<FieldPaths>

//

/*
because referenced data can only be documents, so `where`, `take`, `select` are only avaliable for documents.
`where` and `select` are similar as they all can see properties deeply, but where `select` uses keys to choose what fields are to be queried with `true`, `where` uses keys to provide logical operators like `and`, `or`.
*/
const shopDocumentsQueryShowingPossibilities: any = {
  where: {
    id: 'doc_123',
  },
  take: 1,
  select: {
    title: true,
    address: true,
    // array
    employees: {
      where: {},
      take: 10,
      select: {
        name: true,
        surname: true,
      },
    },
  },
}

// export const employeeDefinition = defineDocument({
//   type: 'employee',
//   fields: {
//     name: defineString(),
//     surname: defineString(),
//     position: defineString(),
//     deputy: defineReference({
//       options: {
//         to: ['employee'] as const,
//         size: 'default',
//       },
//     }),
//   },
// })

// export const shopDefinition = defineDocument({
//   type: 'shop',
//   fields: {
//     title: defineString({
//       title: 'Title',
//     }),
//     director: defineReference({
//       title: 'Directorrr',
//       options: {
//         to: ['employee'] as const,
//         size: 'default',
//       },
//     }),
//     location: defineString({
//       options: {
//         placeholder: 'Country',
//         predefined: {
//           display: 'dropdown',
//           options: [
//             { value: 'russia', title: 'Russia' },
//             { value: 'moldova', title: 'Moldova' },
//             { value: 'new-york', title: 'New York' },
//           ],
//         },
//       },
//     }),
//   },
// })

type ExtractToFromReferenceField<F extends FieldDefinition> = F extends { type: 'reference' }
  ? NonNullable<F['options']>['to'][number]
  : never

type QueryForDocument<D extends DocumentDefinition> = {
  where?: {
    [F in keyof D['fields']]?: any
  }
  take?: number
  select?: {
    [F in keyof D['fields']]?: D['fields'][F] extends { type: 'reference' }
      ? QueryForDocument<
          Extract<CustomDocumentDefinition[][number], { type: ExtractToFromReferenceField<D['fields'][F]> }>
        > & {
          select: { _ref?: true }
        }
      : true
  }
}

const q = defineQueryForDocument({
  where: {
    // type narrowing: include document type in here, `select` will use it to narrow does the type
  },
  // select: {
  //   // include system fields like `_type`, `_createdAt`, `_id`
  //   location: true,
  //   director: {
  //     select: {
  //       name: true,
  //       deputy: {
  //         select: {
  //           _ref: true,
  //           name: true,
  //         },
  //       },
  //     },
  //   },
  // },
})

export function defineQueryForDocument<Q extends QueryForDocument<CustomDocumentDefinition>>(query: Q) {
  return query
}

// const res = {} as SimplifyDeep<InferQuery<CustomDefinition, typeof q>>

type InferQuery<D extends DocumentDefinition, Q extends QueryForDocument<D>> = Q extends { select: any }
  ? Partial<{
      [F in keyof Q['select']]: D['fields'][F & string] extends { type: 'reference' }
        ? (Q['select'][F] extends { select: any }
            ? InferQuery<
                Extract<CustomDocumentDefinition, { type: ExtractToFromReferenceField<D['fields'][F & string]> }>,
                Q['select'][F]
              >
            : never) &
            ('_ref' extends keyof Q['select'][F]['select'] ? { _ref: string } : {})
        : true extends Q['select'][F]
          ? z.infer<D['fields'][F & string]['shape']>
          : never
    }>
  : {
      [F in keyof D['fields']]: z.infer<D['fields'][F]['shape']>
    }
