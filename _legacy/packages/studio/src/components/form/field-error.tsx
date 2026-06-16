export type FieldErrorProps = {
  message: string
}

export default function FieldError(props: FieldErrorProps) {
  return (
    <section className='bg-rose-500/10 px-4 py-3 rounded-md'>
      <span className='text-rose-500 text-sm'>{props.message}</span>
    </section>
  )
}
