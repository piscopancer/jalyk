import { AuthProvider, UserRole } from '../../trpc/prisma'
import { GitHubIcon } from './assets/icons/github'
import { GoogleIcon } from './assets/icons/google'
import { SvgComponentType } from './utils'

export const rolesInfo: Record<UserRole, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Обозреватель',
}

export const providerIcons: Record<AuthProvider, SvgComponentType> = {
  github: GitHubIcon,
  google: GoogleIcon,
}
