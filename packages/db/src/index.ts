export * from './generated/client.ts'
export { prisma, createClient, createSeedClient, type Db } from './client.js'
export {
  DbConfig,
  DbConfigLive,
  DbConfigLocal,
  DbConfigSupabase,
  dbTarget,
  migrationUrl,
  runtimeUrl,
  seedDatabaseUrl,
  type DbConnection,
  type DbTarget,
} from './config.js'
export { PLAN_LIMITS, type PlanLimits } from './plans.js'
