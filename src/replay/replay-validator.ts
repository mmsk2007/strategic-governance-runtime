/**
 * ReplayValidator - validates replay results by comparing governance outputs.
 *
 * Performs field-by-field comparison of original and replayed governance
 * outputs, and flags known sources of non-determinism such as timestamps
 * and UUIDs.
 */

import type { GovernanceOutput } from "../types/index.js";

/**
 * Comparison result for a single field.
 */
export interface FieldComparison {
  readonly field: string;
  readonly match: boolean;
  readonly original: unknown;
  readonly replayed: unknown;
}

/**
 * Complete validation result for a replay.
 */
export interface ReplayValidation {
  /** Whether all deterministic fields matched */
  readonly matched: boolean;

  /** Per-field comparison results */
  readonly field_comparisons: FieldComparison[];

  /** Known sources of non-determinism detected */
  readonly non_determinism_sources: string[];
}

/** Fields known to be inherently non-deterministic. */
const NON_DETERMINISTIC_FIELDS = new Set([
  "decision_id",
  "authority_epoch_id",
  "replay_binding",
]);

/** Patterns that indicate a timestamp value. */
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

/** Pattern that indicates a UUID value. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReplayValidator {
  /**
   * Validates a replay by comparing original and replayed governance outputs.
   *
   * Fields that are inherently non-deterministic (timestamps, UUIDs, decision IDs)
   * are flagged but do not cause a mismatch verdict.
   */
  validate(
    original: GovernanceOutput,
    replayed: GovernanceOutput,
  ): ReplayValidation {
    const fieldComparisons: FieldComparison[] = [];
    const nonDeterminismSources: string[] = [];

    const fieldsToCompare: Array<{ field: string; originalVal: unknown; replayedVal: unknown }> = [
      { field: "final_decision", originalVal: original.final_decision, replayedVal: replayed.final_decision },
      { field: "explanation_code", originalVal: original.explanation_code, replayedVal: replayed.explanation_code },
      { field: "decision_id", originalVal: original.decision_id, replayedVal: replayed.decision_id },
      { field: "authority_epoch_id", originalVal: original.authority_epoch_id, replayedVal: replayed.authority_epoch_id },
      { field: "constraints_applied", originalVal: original.constraints_applied, replayedVal: replayed.constraints_applied },
      { field: "debug_trace", originalVal: original.debug_trace, replayedVal: replayed.debug_trace },
      { field: "replay_binding", originalVal: original.replay_binding, replayedVal: replayed.replay_binding },
    ];

    for (const { field, originalVal, replayedVal } of fieldsToCompare) {
      const isNonDeterministic = NON_DETERMINISTIC_FIELDS.has(field);
      const match = this.deepEqual(originalVal, replayedVal);

      fieldComparisons.push({
        field,
        match,
        original: originalVal,
        replayed: replayedVal,
      });

      if (!match && isNonDeterministic) {
        nonDeterminismSources.push(field);
      }
    }

    // Detect timestamp and UUID non-determinism in the artifact
    this.detectNonDeterminism(original, replayed, nonDeterminismSources);

    // Overall match excludes known non-deterministic fields
    const matched = fieldComparisons
      .filter((c) => !NON_DETERMINISTIC_FIELDS.has(c.field))
      .every((c) => c.match);

    return {
      matched,
      field_comparisons: fieldComparisons,
      non_determinism_sources: nonDeterminismSources,
    };
  }

  /**
   * Scans output values for timestamps and UUIDs that indicate
   * non-deterministic content.
   */
  private detectNonDeterminism(
    original: GovernanceOutput,
    replayed: GovernanceOutput,
    sources: string[],
  ): void {
    const artifact = original.decision_artifact;
    if (!artifact) return;

    if (artifact.decided_at && TIMESTAMP_PATTERN.test(artifact.decided_at)) {
      if (!sources.includes("decided_at")) {
        sources.push("decided_at");
      }
    }

    if (artifact.decision_id && UUID_PATTERN.test(artifact.decision_id)) {
      if (!sources.includes("decision_id_uuid")) {
        sources.push("decision_id_uuid");
      }
    }
  }

  /**
   * Deep equality check for comparing field values.
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      const aJson = JSON.stringify(a);
      const bJson = JSON.stringify(b);
      return aJson === bJson;
    }

    return false;
  }
}
