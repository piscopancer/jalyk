import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  advanced: {
    cookiePrefix: 'jalyk',
    useSecureCookies: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 365,
  },
  baseURL: 'http://localhost:8484',
  socialProviders: {
    github: {
      clientId: 'Ov23liO8atZ97dDsdijB',
      clientSecret: '39098fd7705dc57ea4fe4cb97571d86e3c34a5a1',
    },
    discord: {
      clientId: '1391893787575455847',
      clientSecret: '26b7e562a3d12247fad7d2080f0d4a6469672056a58d0135fb7019b06242caeb',
    },
  },
})
