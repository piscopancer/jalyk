import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn.ts'

/** Тема логотипа. Не задана — рисуется `currentColor` (наследует цвет текста и сам флипается с темой окружения). `'dark'` — белый, `'light'` — чёрный. */
export type JalykLogoTheme = 'dark' | 'light'

type JalykLogoProps = Omit<ComponentProps<'svg'>, 'fill'> & {
  theme?: JalykLogoTheme
}

/** Логотип продукта Jalyk. SVG вшит в компонент. Цвет: явный `theme` (dark → белый, light → чёрный) либо `currentColor`, если тема не передана. Дефолтная иконка студии, когда в её конфиге не задана своя. */
export function JalykLogo({ theme, className, ...props }: JalykLogoProps) {
  const fill =
    theme === 'dark' ? '#fff' : theme === 'light' ? '#000' : 'currentColor'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={cn('size-4', className)}
      {...props}
    >
      <path
        fill={fill}
        d="M18,18V238H238V18ZM223,184.29c0,20.19-16.43,38.42-36.58,39.64A39,39,0,0,1,145,185h21.17a17.83,17.83,0,0,0,19.43,17.76c9-.78,16.23-9.19,16.23-18.18V139.31H223ZM223,126H145V104.42h78Zm0-35.21H130V69.21h93Zm0-35.21H67V34H223Z"
      />
    </svg>
  )
}
