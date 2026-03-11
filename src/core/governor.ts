/**
 * Governor — the main decision engine for Strategic Governance Runtime v2.
 *
 * Implements the SRG_GOVERN flow from the v1 pseudocode:
 *
 *   1. Policy veto check (hard blocks)
 *   2. Load state (with decay)
 *   3. Mode check (shadow passthrough)
 *   4. Metrics check (trust, debt, drift)
 *   5. Intervention check (risk tier gating)
 *   6. Threshold computation
 *   7. Final decision
 *
 * Each gate can short-circuit with an appropriate explanation code.
 */

import crypto from "node:crypto";

import type { GovernanceMode } from "../types/index.js";

import type { ExplanationCode } from "./explanation-codes.js";
import type { PolicyEngine, PolicyVeto, PolicyInput } from "./policy-engine.js";
import type { StateStore, GovernanceState } from "./state-store.js";
import { createDefaultState } from "./state-store.js";
import type { DecayEngine } from "./decay-engine.js";
import type { ThresholdConfig, ThresholdInput } from "./threshold-calculator.js";
import { computeThresholdDetailed, type ThresholdBreakdown } from "./threshold-calculator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible final decisions the governor can render. */
export type FinalDecision =
  | "ALLOW"
  | "DENY"
  | "ALLOW_WITH_CONSTRAINTS"
  | "ESCALATE"
  | "HALT";

/** A single entry in the debug trace. */
export interface DebugTraceEntry {
  readonly gate: string;
  readonly timestamp: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
}

/** Minimal governance input for the governor. */
export interface GovernanceInput {
  readonly proposed_action: string;
  readonly model_score_raw: number;
  readonly final_probability: number;
  readonly context: Record<string, unknown>;
  readonly constraints: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly authority_token?: Record<string, unknown>;
  readonly delegation_envelope?: Record<string, unknown> | null;
  readonly human_confirmation?: Record<string, unknown> | null;
  readonly context_schema_version?: string;
}

/** The complete output from the governor. */
export interface GovernanceOutput {
  readonly final_decision: FinalDecision;
  readonly constraints_applied: readonly Record<string, unknown>[];
  readonly explanation_code: ExplanationCode;
  readonly decision_id: string;
  readonly debug_trace: readonly DebugTraceEntry[];
  readonly decision_artifact?: Record<string, unknown>;
  readonly authority_epoch_id?: string;
  readonly replay_binding?: Record<string, unknown>;
  readonly state_snapshot?: GovernanceState;
  readonly threshold_breakdown?: ThresholdBreakdown;
}

/** Configuration for the governor. */
export interface GovernorConfig {
  /** Default scope for state lookups. */
  readonly default_scope?: string;

  /** Threshold calculator configuration. */
  readonly threshold?: ThresholdConfig;

  /** Trust score below which ESCALATE is returned. Default: 0.3. */
  readonly trust_escalate_threshold?: number;

  /** Confidence debt above which ESCALATE is returned. Default: 1.0. */
  readonly debt_escalate_threshold?: number;

  /** Drift score above which DEFENSIVE mode is triggered. Default: 0.7. */
  readonly drift_alert_threshold?: number;

  /** Whether to include debug trace in output. Default: true. */
  readonly include_debug_trace?: boolean;

  /** Authority epoch ID for this governor instance. */
  readonly authority_epoch_id?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_GOVERNOR_CONFIG: Required<GovernorConfig> = {
  default_scope: "default",
  threshold: {},
  trust_escalate_threshold: 0.3,
  debt_escalate_threshold: 1.0,
  drift_alert_threshold: 0.7,
  include_debug_trace: true,
  authority_epoch_id: "epoch-0",
};

// ---------------------------------------------------------------------------
// Governor
// ---------------------------------------------------------------------------

/**
 * The Governor is the main decision engine. It orchestrates policy
 * evaluation, state management, decay, threshold computation, and
 * final decision rendering.
 */
export class Governor {
  private readonly policyEngine: PolicyEngine;
  private readonly stateStore: StateStore;
  private readonly decayEngine: DecayEngine;
  private readonly config: Required<GovernorConfig>;

  constructor(
    policyEngine: PolicyEngine,
    stateStore: StateStore,
    decayEngine: DecayEngine,
    config?: GovernorConfig,
  ) {
    this.policyEngine = policyEngine;
    this.stateStore = stateStore;
    this.decayEngine = decayEngine;
    this.config = { ...DEFAULT_GOVERNOR_CONFIG, ...config };
  }

  /**
   * Execute the SRG_GOVERN flow.
   *
   * @param input — Governance input describing the proposed action.
   * @param scope — State scope (defaults to config.default_scope).
   * @returns Governance output with decision, explanation, and trace.
   */
  async govern(
    input: GovernanceInput,
    scope?: string,
  ): Promise<GovernanceOutput> {
    const effectiveScope = scope ?? this.config.default_scope;
    const decisionId = crypto.randomUUID();
    const trace: DebugTraceEntry[] = [];

    const addTrace = (gate: string, message: string, data?: Record<string, unknown>) => {
      trace.push({
        gate,
        timestamp: new Date().toISOString(),
        message,
        data,
      });
    };

    // ── Gate 1: Policy veto check ──────────────────────────────
    addTrace("policy_veto", "Evaluating policy rules");

    const veto = this.policyEngine.evaluate(input as unknown as PolicyInput);
    if (veto) {
      addTrace("policy_veto", "Policy veto triggered", {
        rule_id: veto.rule_id,
        explanation_code: veto.explanation_code,
      });

      return this.buildOutput({
        decision: "DENY",
        explanation_code: veto.explanation_code,
        decision_id: decisionId,
        trace,
      });
    }
    addTrace("policy_veto", "No policy veto — proceeding");

    // ── Gate 2: Load state (with decay) ────────────────────────
    addTrace("load_state", "Loading governance state", { scope: effectiveScope });

    let state = await this.stateStore.load(effectiveScope);
    if (!state) {
      state = createDefaultState();
      addTrace("load_state", "No existing state — using defaults");
    }

    // Apply time-based decay
    const elapsed = DecayEngineStatic.computeElapsed(state.last_updated);
    if (elapsed > 0) {
      state = this.decayEngine.decay(state, elapsed);
      addTrace("load_state", "Decay applied", { elapsed_ms: elapsed });
    }

    // ── Gate 3: Mode check (shadow passthrough) ────────────────
    addTrace("mode_check", `Current mode: ${state.mode}`);

    if (state.mode === "SHADOW") {
      addTrace("mode_check", "Shadow mode — allowing without intervention");
      await this.stateStore.save(effectiveScope, state);

      return this.buildOutput({
        decision: "ALLOW",
        explanation_code: "L5_SHADOW",
        decision_id: decisionId,
        trace,
        state,
      });
    }

    if (state.mode === "HALT") {
      addTrace("mode_check", "Halt mode — denying all actions");
      return this.buildOutput({
        decision: "HALT",
        explanation_code: "L1_SAFETY_BLOCK",
        decision_id: decisionId,
        trace,
        state,
      });
    }

    // ── Gate 4: Metrics check (trust, debt, drift) ─────────────
    addTrace("metrics_check", "Evaluating governance metrics", {
      trust_score: state.trust_score,
      confidence_debt: state.confidence_debt,
      drift_score: state.drift_score,
    });

    // Low trust → escalate
    if (state.trust_score < this.config.trust_escalate_threshold) {
      addTrace("metrics_check", "Trust score below escalation threshold", {
        trust_score: state.trust_score,
        threshold: this.config.trust_escalate_threshold,
      });
      await this.stateStore.save(effectiveScope, state);

      return this.buildOutput({
        decision: "ESCALATE",
        explanation_code: "L2_LOW_TRUST",
        decision_id: decisionId,
        trace,
        state,
      });
    }

    // High debt → escalate
    if (state.confidence_debt > this.config.debt_escalate_threshold) {
      addTrace("metrics_check", "Confidence debt above escalation threshold", {
        confidence_debt: state.confidence_debt,
        threshold: this.config.debt_escalate_threshold,
      });
      await this.stateStore.save(effectiveScope, state);

      return this.buildOutput({
        decision: "ESCALATE",
        explanation_code: "L2_HIGH_DEBT",
        decision_id: decisionId,
        trace,
        state,
      });
    }

    // High drift → defensive note (but continue evaluation)
    if (state.drift_score > this.config.drift_alert_threshold) {
      addTrace("metrics_check", "Drift score above alert threshold", {
        drift_score: state.drift_score,
        threshold: this.config.drift_alert_threshold,
      });
    }

    addTrace("metrics_check", "Metrics within acceptable bounds");

    // ── Gate 5: Intervention check ─────────────────────────────
    // In v2, intervention gating is handled by the authority layer.
    // Here we check for quarantine mode which blocks non-essential actions.
    if (state.mode === "QUARANTINE") {
      addTrace("intervention_check", "Quarantine mode — escalating for approval");
      await this.stateStore.save(effectiveScope, state);

      return this.buildOutput({
        decision: "ESCALATE",
        explanation_code: "L3_REGIME_CHANGE",
        decision_id: decisionId,
        trace,
        state,
      });
    }

    addTrace("intervention_check", "Intervention check passed");

    // ── Gate 6: Threshold computation ──────────────────────────
    const thresholdInput: ThresholdInput = {
      mode: state.mode,
      drift_score: state.drift_score,
      confidence_debt: state.confidence_debt,
    };

    const thresholdBreakdown = computeThresholdDetailed(
      thresholdInput,
      this.config.threshold,
    );

    addTrace("threshold", "Threshold computed", {
      T_eff: thresholdBreakdown.T_eff,
      clamped: thresholdBreakdown.clamped,
      final_probability: input.final_probability,
    });

    // ── Gate 7: Final decision ─────────────────────────────────
    const finalProbability = input.final_probability;

    let decision: FinalDecision;
    let explanationCode: ExplanationCode;

    if (finalProbability >= thresholdBreakdown.T_eff) {
      // Probability meets or exceeds the threshold → ALLOW
      decision = "ALLOW";
      explanationCode = "L5_ALLOW";
      addTrace("decision", "Action allowed — probability meets threshold");
    } else if (finalProbability >= thresholdBreakdown.T_eff * 0.8) {
      // Close to threshold → ALLOW_WITH_CONSTRAINTS
      decision = "ALLOW_WITH_CONSTRAINTS";
      explanationCode = "L4_SAFE_DEFAULT";
      addTrace("decision", "Action allowed with constraints — probability near threshold");
    } else {
      // Below threshold → DENY
      decision = "DENY";
      explanationCode = "L2_LOW_TRUST";
      addTrace("decision", "Action denied — probability below threshold", {
        final_probability: finalProbability,
        T_eff: thresholdBreakdown.T_eff,
        gap: thresholdBreakdown.T_eff - finalProbability,
      });
    }

    // Persist updated state
    await this.stateStore.save(effectiveScope, state);

    return this.buildOutput({
      decision,
      explanation_code: explanationCode,
      decision_id: decisionId,
      trace,
      state,
      threshold_breakdown: thresholdBreakdown,
    });
  }

  // ── Private helpers ────────────────────────────────────────────

  private buildOutput(params: {
    decision: FinalDecision;
    explanation_code: ExplanationCode;
    decision_id: string;
    trace: DebugTraceEntry[];
    state?: GovernanceState;
    threshold_breakdown?: ThresholdBreakdown;
  }): GovernanceOutput {
    return {
      final_decision: params.decision,
      constraints_applied: [],
      explanation_code: params.explanation_code,
      decision_id: params.decision_id,
      debug_trace: this.config.include_debug_trace ? params.trace : [],
      authority_epoch_id: this.config.authority_epoch_id,
      state_snapshot: params.state,
      threshold_breakdown: params.threshold_breakdown,
    };
  }
}

// ---------------------------------------------------------------------------
// Static reference to DecayEngine.computeElapsed
// (avoids importing the class just for a static method)
// ---------------------------------------------------------------------------

const DecayEngineStatic = {
  computeElapsed(lastUpdated: string, now?: Date): number {
    const last = new Date(lastUpdated).getTime();
    const current = (now ?? new Date()).getTime();
    return Math.max(0, current - last);
  },
};
