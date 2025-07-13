import { GitHubIcon } from './assets/icons/github'
import { GoogleIcon } from './assets/icons/google'
import { SvgComponentType } from './utils'

// TODO: take these from trpc but build fails when exporting anything from prisma???
type UserRole = 'owner' | 'editor' | 'viewer'

export const rolesInfo: Record<UserRole, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Обозреватель',
}

// TODO: take these from trpc but build fails when exporting anything from prisma???
type AuthProvider = 'google' | 'github'

export const providerIcons: Record<AuthProvider, SvgComponentType> = {
  github: GitHubIcon,
  google: GoogleIcon,
}
