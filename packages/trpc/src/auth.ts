import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  advanced: {
    cookiePrefix: 'jalyk',
    useSecureCookies: true,
  },
  trustedOrigins: ['http://localhost:3000'],
  session: {
    expiresIn: 60 * 60 * 24 * 365,
  },
  baseURL: 'http://localhost:8484',
  socialProviders: {
    github: {
      clientId: 'Ov23liO8atZ97dDsdijB',
      clientSecret: '39098fd7705dc57ea4fe4cb97571d86e3c34a5a1',
    },
    // discord: {
    //   clientId: '1391893787575455847',
    //   clientSecret: '-K9qDcm9bH2G0x0wujNCDVuUfx1NuiiW',
    //   // redirectURI: 'http://localhost:3000/studio',
    // },
    google: {
      clientId: '1014171810654-6ncj4hnsttljq1lqf9ei5tro8jdt8ouh.apps.googleusercontent.com',
      clientSecret: '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',
    },
  },
})
