/**
 * Typed domain error hierarchy.
 * All errors originate purely in domain logic with zero infrastructure knowledge.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Preserve prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Invalid transition: ${from} -> ${to}`);
  }
}

export class VersionConflictError extends DomainError {
  constructor() {
    super('Version conflict – record was modified by a concurrent request');
  }
}

export class VisitNotFoundError extends DomainError {
  constructor(visitId: string) {
    super(`Visit not found: ${visitId}`);
  }
}
