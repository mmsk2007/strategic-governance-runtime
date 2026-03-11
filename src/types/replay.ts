/**
 * Replay types for Strategic Governance Runtime v2.
 *
 * Replay enables deterministic re-execution of governance decisions
 * for audit, debugging, and compliance verification. A replay session
 * binds to a version vector and re-processes a sequence of inputs,
 * comparing the replayed outputs against the original artifacts.
 */

import type { VersionVector, ReplayBinding } from "./version-binding.js";
import type { GovernanceState } from "./governance.js";
import type { DecisionArtifact } from "./decision.js";

/**
 * Status of a replay session.
 */
export type ReplayStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Outcome of replaying a single decision.
 */
export type ReplayVerdict =
  | "match"
  | "mismatch"
  | "skipped"
  | "error";

/**
 * Result of replaying a single decision artifact.
 */
export interface ReplayStepResult {
  /** ID of the original decision being replayed */
  readonly original_decision_id: string;

  /** The replayed decision artifact (produced by re-execution) */
  readonly replayed_artifact: DecisionArtifact;

  /** Whether the replay matched the original */
  readonly verdict: ReplayVerdict;

  /** Fields that differed between original and replay, if any */
  readonly divergences: ReadonlyArray<ReplayDivergence>;

  /** Wall-clock duration of the replay step in milliseconds */
  readonly duration_ms: number;
}

/**
 * A specific field divergence between the original and replayed decision.
 */
export interface ReplayDivergence {
  /** JSON path to the divergent field, e.g. "decision" or "state_after.trust_score" */
  readonly field_path: string;

  /** Value in the original artifact (serialized to JSON-compatible form) */
  readonly original_value: unknown;

  /** Value in the replayed artifact (serialized to JSON-compatible form) */
  readonly replayed_value: unknown;

  /** Severity of the divergence */
  readonly severity: "critical" | "warning" | "informational";
}

/**
 * A complete replay result summarizing the outcome of replaying
 * a sequence of decisions.
 */
export interface ReplayResult {
  /** Unique identifier for this replay result */
  readonly result_id: string;

  /** ID of the replay session that produced this result */
  readonly session_id: string;

  /** Per-step replay results, ordered by original decision sequence */
  readonly steps: ReadonlyArray<ReplayStepResult>;

  /** Total number of decisions replayed */
  readonly total_steps: number;

  /** Number of steps that matched the original */
  readonly matched_count: number;

  /** Number of steps that diverged from the original */
  readonly mismatched_count: number;

  /** Number of steps skipped (e.g. due to missing inputs) */
  readonly skipped_count: number;

  /** Number of steps that encountered errors */
  readonly error_count: number;

  /** Overall replay fidelity as a ratio in [0, 1] */
  readonly fidelity_score: number;

  /** ISO-8601 timestamp when the replay completed */
  readonly completed_at: string;

  /** Total wall-clock duration in milliseconds */
  readonly total_duration_ms: number;
}

/**
 * A replay session: the top-level container for a replay operation.
 */
export interface ReplaySession {
  /** Unique identifier for this replay session */
  readonly session_id: string;

  /** Replay binding tying this session to a version vector */
  readonly binding: ReplayBinding;

  /** IDs of the original decision artifacts being replayed */
  readonly artifact_ids: ReadonlyArray<string>;

  /** Governance state to use as the starting point for replay */
  readonly initial_state: GovernanceState;

  /** Current status of the replay session */
  readonly status: ReplayStatus;

  /** ISO-8601 timestamp when the session was created */
  readonly created_at: string;

  /** ISO-8601 timestamp when the session started executing */
  readonly started_at: string | null;

  /** ISO-8601 timestamp when the session completed */
  readonly completed_at: string | null;

  /** ID of the principal who initiated the replay */
  readonly initiated_by: string;

  /** Replay result, populated once the session completes */
  readonly result: ReplayResult | null;
}
