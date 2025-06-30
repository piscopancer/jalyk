документы хранятся в бд как таблица с обязательными \_id, а остальные поля хранятся в поле fields. доки закреплены за проектами, у проектов есть id, title и так далее.

```
doc_69 {
  id: 123,
  fields: [...],
}
```

fields документа включает в себя поля документа

```
fields: [
  {
    id: 123,
    type: ...,
  },
  {
    id: 456,
    type: ...,
  },
],
```

так можно будет

```
table project {
  id: 000
  documents: Document[]
}

найти поле, name которого == surname и документ в котором оно находится имеет id === 000

table Document {
  id: 123
  project_id: 000
  fields: (json) {
    name: surname
    type: string/number/date
    value: ?
  }[]
}
```

найти field где name === "surname" и вернуть все поле

# клиент

клиент просит конфиг, в котором указан айди проекта, делает подключение и предоставляет контекст через провайдер чтобы все хуки админки могли пользоваться этим контекстом

клиент отдает функции для изменения полей в json документа, с их помощью можно построить какой угодно компонент, но можно использовать и стандартные

path будет предоставлен каждому филдсету, чтобы тот знал куда записывать новое значение и откуда его брать, path будет массивом из строк и чисел

у всех инпутов есть onChange, поэтому нужно сделать 1 место где определяется этот метод одной формы вне зависимости от типа значения

если хранить `Field` в форме таблицы с полями `name`(`string`) и `value`(`json`), то выйдет хранить любое сериализуемое значение, даже массивы. но массивы могут быть любого типа даже нескольких одновременно, что будет указано при создании нового пункта массива. например, массив может включать строку, число и дкоумент типа `employee` одновременно. тогда его запись будет выглядеть так

если я буду хранить поле `_type` в бд, то когда значение приходит с бд я могу сравнивать его тип и тип в поле инпута админки (но наверное сравнивать просто по значению легче?, а что если объект или массив?). если не хранить тип, то можно написать кастомный проверщик, который рекурсивно определяет путь до значения которого нет для объектив и массивов

```
field {
  name: username
  type: string
}
```

i need this string validation in case user wants to change the type from string to number. in that case zod will return an error. it's only required for `fields` as documents use `fields` to draw inputs and are not supposed to have dynamic validation on themselves. Actually they have validation but it is only for message "this field is present in the db but it's not in the schema" (for when changing old document to a new shape in the studio). so this is "shape" validation, and the 2nd validation is value validation that is provided by the user. Shape validation can be done too but thise

inputs are rerendered by themselves, making it possible to stuff 100 components and it will be just fine. every input has a query inside it with a path that it is, eg `project_id.document_id.field_name` for plain values and `project_id.document_id.field_name.field_seg.field_seg.field_seg` for objects.

If working in project `porn` with a document `fuck`, and the field of interest is `boobs` then the workflow is as follows:

1. reading the value: there may be a hook like `useFieldValueQuery`. with WS connection, that's gonna be better. studio listens to the changes made across the whole project, though there's only 1 connections per studio, otherwise there would be 100 connections for 100 inputs. the top component of studio replaces the cache for the key (equals to retrieved path) with a new value.
2. changing a field: input does the upsert for path `porn.fuck.boobs` with a value
3. listening to the changes: after server emits the event with a before mentioned `path` that, only this input rerenders as it uses react query to listen to the key of this path. other 99 inputs do not care and do nothing.

if type of field is `object`, there's an additional field `shape` that takes a zod object and passes it down to the component that renders an object.

клиент предоставляет студии `projectId` и она передает его в путь, затем там путь читается и устанавливается сокет соединение

для кастомизации студии использовать css переменные, тк стоит tailwind

для ui и studio нужно генерировать css файл и экспортировать его и просить людей вставить его себе в приложение

- перенести инпуты и другие штуки в ui, там же поставить tsup как в studio
- подумать как сделать структуру (eraser)

- тип для запроса должен оставаться на клиенте, так как именно там объявляются все поля и документы. структура объекта объявляется через zod. потому объявленная модель используется чтобы проверить пришедший с БД `value`, если какое-то поле не верное, то взять путь из ошибки zod и показать его. При upsert поля, каждому нужно добавить debounce в 1с.

# алгоритм дереференса документа

1. собрать из json запроса все айди документов (рекурсивно для каждого value найти где объект включает в себя `_ref`) и запросить их с бд, запихнуть в карту (айди-инфа) чтобы затем брать эти документы отсюда
2. там где ключ: true то забрать из документа, если тип ключа объект, то ебать проверить его тип.

# Field

новый вариант для field: у field будут поля `project_id`, `document_id`, `path`. Если массив `animals` в документе с `id` `zoo123`, то его полем будет `<project_id>.zoo123.animals.12` (???). Если мы вдруг решили что animals должен стать объектом `{cats: string[], wolves: string[]}`, то `x.animals.[1..12]` останутся, но новые поля будут добавлены как `<project_id>.zoo123.animals.cats.0` и `<project_id>.zoo123.animals.wolves.0`.

If user provided `shape` as a zod object, for each property recursively generate a key which would be changed by the input.

# Document

`useDocumentQuery` takes an `id` of a document. returns basic document info and array of field ids. for them to referenced with `useFieldQuery` or smth.

`usePreviewQuery` uses react query transform to extract `media`, `title`, `subtitle`. it can also make async queries, for previews meaning the preview will not be instant, that way i could use `useDocumentQuery` in there reading data from another document to display it there. Previews are not tied to document declarations, there can be many functions but the must all return the same structure of 3 mentioned above.

`referenceShape` must take some sort of filter and search functions. filter describes what documents appear at all. search

when clicking `+` to create a new document, the new "window" will open where generated (on the client) id will be passed. document is not created until one of its inputs calls upsert which in turn will create a missing document. the list rendering

## Preview

for an automatic preview there must be at least one string field in the document which content will be taken to the `title` of the preview. the actions, media will be resolved from the document declaration as the document's `type` is used to find it in the schema. if there's 0 string titles, the id is displayed in the title unless preview props are specified.

# Structure

Segment logic. All have `expanded` flag. When below min width it collapses, but can be expanded manually again.
