import { Link, createFileRoute } from '@tanstack/react-router'

// Главная-заглушка со ссылками на студию и витрину альбомов.
export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Тестовый клиент Jalyk</h1>
      <p className="mt-2 text-muted-foreground">
        Студия встроена на{' '}
        <Link to="/studio" className="text-primary underline">
          /studio
        </Link>
        , витрина альбомов —{' '}
        <Link to="/albums" className="text-primary underline">
          /albums
        </Link>
        .
      </p>
    </div>
  )
}
