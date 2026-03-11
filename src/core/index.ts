/**
 * Core engine modules for Strategic Governance Runtime v2.
 *
 * Re-exports all public types, classes, and functions from the core layer.
 */

// ── Explanation Codes ──────────────────────────────────────────
export {
  type ExplanationLevel,
  type ExplanationCode,
  type ExplanationCodeEntry,
  EXPLANATION_CODES,
  getExplanationCode,
  getExplanationLevel,
  getExplanationDescription,
  getCodesByLevel,
  isMoreSevere,
} from "./explanation-codes.js";

// ── Threshold Calculator ───────────────────────────────────────
export {
  type ThresholdConfig,
  type ThresholdInput,
  type ThresholdBreakdown,
  getModeAdjustment,
  computeThreshold,
  computeThresholdDetailed,
} from "./threshold-calculator.js";

// ── Policy Engine ──────────────────────────────────────────────
export {
  type PolicyInput,
  type PolicyRule,
  type PolicyVeto,
  PolicyEngine,
} from "./policy-engine.js";

// ── State Store ────────────────────────────────────────────────
export {
  type Streaks,
  type GovernanceState,
  type StateStore,
  createDefaultState,
  InMemoryStateStore,
} from "./state-store.js";

// ── Decay Engine ───────────────────────────────────────────────
export {
  type DecayConfig,
  type DecayBreakdown,
  DecayEngine,
} from "./decay-engine.js";

// ── Outcome Attribution ────────────────────────────────────────
export {
  type Outcome,
  type OutcomeAttributionConfig,
  type AttributionResult,
  OutcomeAttribution,
} from "./outcome-attribution.js";

// ── Governor ───────────────────────────────────────────────────
export {
  type FinalDecision,
  type DebugTraceEntry,
  type GovernanceInput,
  type GovernanceOutput,
  type GovernorConfig,
  Governor,
} from "./governor.js";
