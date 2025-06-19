import { Simplify } from 'type-fest'

/*
while defining fields user specifies the type and (somehow) validation value and options are inferred. so it only is a schema. other parts of studio can read it too. should i somehow combine it?

user cannot store complete data types on my DB like Date, but they can do it with strings. So there must be a way to let them use this type, so an auto transform must happen:
- either with transformer zod functions
- or with 
*/

export interface DocumentDefinitions {}

export type DocumentDefinition = DocumentDefinitions[keyof DocumentDefinitions]

export interface FieldDefinitions {
  string: {
    name: string
    value: string
    options?: {
      select?: {
        type: 'dropdown' | 'select'
        options: string[]
      }
    }
    /** Runs after shape validation */
    validation?: (value: string) => ValidationError | void
  }
  number: {
    name: string
    value: number
    /** Runs after shape validation */
    validation?: (value: number) => ValidationError | void
  }
  reference: {
    name: string
    value: number
    /** Runs after shape validation */
    validation?: (value: number) => ValidationError | void
  }
  // number: NumberFieldDefinition
  // boolean: BooleanFieldDefinition
  // reference: ReferenceFieldDefinition
}

type FieldType = keyof FieldDefinitions
export type FieldDefinition = FieldDefinitions[FieldType]

type DefineField = { [T in FieldType]: Simplify<{ type: T } & Omit<FieldDefinitions[T], 'value'>> }

//

// const stringShapeValidation = z.string().optional()

// type StringFieldDefinition = BaseFieldDefinition<
//   string,
//   {
//     select?: {
//       type: 'dropdown' | 'select'
//       options: string[]
//     }
//   }
// >

// type NumberFieldDefinition = BaseFieldDefinition<number>
// type BooleanFieldDefinition = BaseFieldDefinition<boolean>

// const referenceShapeValidation = z.object({
//   _ref: z.string({ message: 'Document reference must be a string' }),
// })

// type Reference = z.infer<typeof referenceShapeValidation>

// type ReferenceFieldDefinition = BaseFieldDefinition<
//   Reference,
//   {
//     to: DocumentDefinition[]
//   }
// >

//

export type ValidationError = {
  message: string
  severity: 'warning' | 'error'
}

// type BaseFieldDefinition<V extends JsonValue, O extends object = object> = {
//   name: string
//   value: V
//   options?: O
//   /** Runs after shape validation */
//   validation?: (value: V) => ValidationError | void
// }

// export function defineField<T extends FieldType>(field: DefineField[T]) {
//   return field
// }

type DocumentDefinitionProps = {
  type: string
  fields: DefineField[FieldType][]
  // | ((define: typeof defineField) => FieldDefinition[])
}

export function defineDocument(doc: DocumentDefinitionProps) {
  return doc
}

const doc = defineDocument({
  type: 'car',
  fields: [
    {
      type: 'string',
      name: 'make',
      options: {
        select: {
          type: 'dropdown',
          options: ['Toyota', 'Ford', 'BMW'],
        },
      },
      validation(value) {
        if (value.startsWith('0')) {
          return {
            message: 'cannot start with 0',
            severity: 'warning',
          }
        }
      },
    },
    {
      type: 'string',
      name: 'someDate',
      /** take the value and try to turn it to something else using zod's coerce, like date string would try to change to date */
      // transform() {
      //   return
      // },
    },
    {
      type: 'number',
      name: 'year',
    },
  ] as const,
})

function defineFieldType() {}
