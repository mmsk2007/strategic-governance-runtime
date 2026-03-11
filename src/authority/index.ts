/**
 * Barrel export for the authority subsystem.
 *
 * Re-exports all public classes, types, and interfaces from the
 * authority modules so consumers can import from "@srg/authority"
 * or "./authority/index.js".
 */

// --- AuthorityModel ---
export {
  AuthorityModel,
} from './authority-model.js';

export type {
  InterventionGate,
  DecisionRight,
  AuthorityKind,
  PolicyCondition,
  AuthorityCeiling,
  AuthorityScope,
  AuthorityPrincipal,
} from './authority-model.js';

// --- AuthorityStateMachine ---
export {
  AuthorityStateMachine,
} from './authority-state-machine.js';

export type {
  AuthorityStatus,
  AuthorityTransition,
} from './authority-state-machine.js';

// --- EpochManager ---
export {
  EpochManager,
} from './epoch-manager.js';

export type {
  VersionVector,
  EpochTrigger,
  AuthorityEpoch,
} from './epoch-manager.js';

// --- AuthorityRegistry ---
export {
  AuthorityRegistry,
} from './authority-registry.js';

export type {
  ScopedToken,
  AuthorityValidationResult,
} from './authority-registry.js';

// --- AuthorityValidator ---
export {
  AuthorityValidator,
} from './authority-validator.js';

export type {
  DelegationEnvelopeInput,
  AuthorityValidationInput,
} from './authority-validator.js';
