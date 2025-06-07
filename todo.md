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
