/**
 * Barrel export for all Strategic Governance Runtime v2 types.
 *
 * Import from "@srg/types" or "./types/index.js" to access
 * all type definitions in a single namespace.
 */

export type {
  SemanticVersion,
  HashDigest,
  VersionVector,
  ReplayBinding,
} from "./version-binding.js";

export type {
  GovernanceMode,
  RiskPosture,
  ModeTransition,
} from "./modes.js";

export type {
  ExplanationCode,
  PolicyThresholds,
  PolicyRule,
  PolicyDocument,
} from "./policy.js";

export type {
  GovernanceDecision,
  Streaks,
  GovernanceState,
} from "./governance.js";

export type {
  AuthorityKind,
  DecisionRight,
  InterventionGate,
  AuthorityCeiling,
  AuthorityScope,
  AuthorityPrincipal,
  AuthorityToken,
} from "./authority.js";

export type {
  EpochTrigger,
  AuthorityEpoch,
  EpochLineage,
} from "./epoch.js";

export type {
  DebugTraceEntry,
  AppliedConstraint,
  DecisionArtifact,
} from "./decision.js";

export type {
  DelegationStatus,
  DelegationLink,
  DelegationEnvelope,
} from "./delegation.js";

export type {
  GovernanceContext,
  CallerConstraints,
  RequestMetadata,
  GovernanceInput,
  GovernanceOutput,
} from "./interface-contract.js";

export type {
  HashAlgorithm,
  MerkleNode,
  MerkleReceipt,
  TimestampSource,
  TrustedTimestamp,
  ConfirmationStrength,
  HumanConfirmation,
  ProvenanceRecord,
} from "./provenance.js";

export type {
  ReplayStatus,
  ReplayVerdict,
  ReplayStepResult,
  ReplayDivergence,
  ReplayResult,
  ReplaySession,
} from "./replay.js";
