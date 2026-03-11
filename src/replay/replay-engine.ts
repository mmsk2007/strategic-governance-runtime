/**
 * ReplayEngine - the core replay orchestrator.
 *
 * Reconstructs governance inputs from a decision artifact, re-runs
 * the governance pipeline, and compares the replayed output against
 * the original decision to detect divergences.
 */

import type {
  DecisionArtifact,
  GovernanceDecision,
  GovernanceOutput,
  ExplanationCode,
} from "../types/index.js";

import { VersionResolver } from "./version-resolver.js";
import { ContextNormalizer } from "./context-normalizer.js";

/**
 * Report describing how replayed results diverged from the original.
 */
export interface DivergenceReport {
  readonly fields: Array<{
    readonly field: string;
    readonly original: unknown;
    readonly replayed: unknown;
  }>;
}

/**
 * Result of replaying a single decision artifact.
 */
export interface ReplayEngineResult {
  /** Whether the replayed decision matched the original */
  readonly matched: boolean;

  /** The original decision ID */
  readonly original_decision_id: string;

  /** The replayed decision summary */
  readonly replayed_decision: {
    readonly final_decision: GovernanceDecision;
    readonly explanation_code: ExplanationCode;
  };

  /** Divergence details, present only when matched is false */
  readonly divergence?: DivergenceReport;
}

/**
 * Governor interface expected by the ReplayEngine.
 * The governor must expose a method that processes governance inputs
 * and returns governance outputs.
 */
export interface Governor {
  evaluate(input: Record<string, unknown>): GovernanceOutput;
}

export class ReplayEngine {
  private readonly governor: Governor;
  private readonly versionResolver: VersionResolver;
  private readonly contextNormalizer: ContextNormalizer;

  constructor(
    governor: Governor,
    versionResolver: VersionResolver,
    contextNormalizer: ContextNormalizer,
  ) {
    this.governor = governor;
    this.versionResolver = versionResolver;
    this.contextNormalizer = contextNormalizer;
  }

  /**
   * Replays a decision artifact by reconstructing the original inputs,
   * re-running governance, and comparing the result.
   */
  replay(artifact: DecisionArtifact): ReplayEngineResult {
    // Resolve versions to ensure replay environment matches
    const resolvedVersions = this.versionResolver.resolve(artifact.version_vector);

    if (resolvedVersions.missing.length > 0) {
      return {
        matched: false,
        original_decision_id: artifact.decision_id,
        replayed_decision: {
          final_decision: artifact.decision,
          explanation_code: artifact.explanation_code,
        },
        divergence: {
          fields: resolvedVersions.missing.map((name) => ({
            field: `version_vector.${name}`,
            original: (artifact.version_vector as Record<string, unknown>)[name],
            replayed: undefined,
          })),
        },
      };
    }

    // Reconstruct governance input from artifact
    const reconstructedInput: Record<string, unknown> = {
      state_before: artifact.state_before,
      mode_at_decision: artifact.mode_at_decision,
      version_vector: artifact.version_vector,
      authority_epoch_id: artifact.authority_epoch_id,
      requesting_principal_id: artifact.requesting_principal_id,
      delegation_chain: artifact.delegation_chain,
      assessed_risk_tier: artifact.assessed_risk_tier,
    };

    // Re-run governance
    const replayedOutput = this.governor.evaluate(reconstructedInput);

    // Compare results
    const divergenceFields: DivergenceReport["fields"] = [];

    if (replayedOutput.final_decision !== artifact.decision) {
      divergenceFields.push({
        field: "final_decision",
        original: artifact.decision,
        replayed: replayedOutput.final_decision,
      });
    }

    if (replayedOutput.explanation_code !== artifact.explanation_code) {
      divergenceFields.push({
        field: "explanation_code",
        original: artifact.explanation_code,
        replayed: replayedOutput.explanation_code,
      });
    }

    const matched = divergenceFields.length === 0;

    const result: ReplayEngineResult = {
      matched,
      original_decision_id: artifact.decision_id,
      replayed_decision: {
        final_decision: replayedOutput.final_decision,
        explanation_code: replayedOutput.explanation_code,
      },
    };

    if (!matched) {
      return { ...result, divergence: { fields: divergenceFields } };
    }

    return result;
  }
}
