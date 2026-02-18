import type { VisitState } from './models.js';

const ALLOWED: Record<VisitState, VisitState[]> = {
  SCANNED: ['WAITING'],
  WAITING: ['URGENT', 'CALLED'],
  URGENT: ['CALLED'],
  CALLED: ['IN_CONSULTATION', 'NO_SHOW'],
  IN_CONSULTATION: ['COMPLETED'],
  COMPLETED: [],
  NO_SHOW: [],
};

export const canTransition = (from: VisitState, to: VisitState): boolean => {
  return ALLOWED[from].includes(to);
};

export const assertTransition = (from: VisitState, to: VisitState): void => {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
};
