import type { Plan } from './generated/client.js'

export type PlanLimits = {
  /** Максимум проектов. null — без ограничения. */
  projects: number | null
  /** Максимум документов на проект. null — без ограничения. */
  documents: number | null
}

// Единственный источник правды по лимитам. Меняем здесь — отражается везде.
export const PLAN_LIMITS = {
  free: { projects: 2, documents: 100 },
  paid: { projects: null, documents: 1000 },
} as const satisfies Record<Plan, PlanLimits>
