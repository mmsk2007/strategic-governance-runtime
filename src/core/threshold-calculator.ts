/**
 * Threshold calculator for Strategic Governance Runtime v2.
 *
 * Implements the effective threshold formula:
 *
 *   T_eff = clamp(T_base + A_mode + A_drift + A_debt + A_value + A_regret, [T_min, T_max])
 *
 * This is a pure function with no side effects — it takes inputs and
 * produces a numeric threshold that the governor uses to decide whether
 * to allow, constrain, or deny an action.
 */

import type { GovernanceMode } from "../types/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for the threshold calculator.
 */
export interface ThresholdConfig {
  /** Base threshold before adjustments. Default 0.5. */
  readonly T_base?: number;

  /** Minimum allowed effective threshold. Default 0.05. */
  readonly T_min?: number;

  /** Maximum allowed effective threshold. Default 0.95. */
  readonly T_max?: number;

  /** Sensitivity multiplier for drift adjustment. Default 0.5. */
  readonly drift_sensitivity?: number;

  /** Sensitivity multiplier for debt adjustment. Default 0.3. */
  readonly debt_sensitivity?: number;

  /** Bounds for the regret adjustment [-max, +max]. Default 0.2. */
  readonly regret_max?: number;
}

/**
 * Inputs to the threshold computation.
 */
export interface ThresholdInput {
  /** Current governance mode. */
  readonly mode: GovernanceMode;

  /** Current drift score (0–1). */
  readonly drift_score: number;

  /** Current confidence debt (0+). */
  readonly confidence_debt: number;

  /** Optional value-based adjustment. */
  readonly value_adjustment?: number;

  /** Optional regret-based adjustment. */
  readonly regret_adjustment?: number;
}

/**
 * Detailed breakdown returned alongside the effective threshold.
 */
export interface ThresholdBreakdown {
  /** The final effective threshold. */
  readonly T_eff: number;

  /** Base threshold used. */
  readonly T_base: number;

  /** Adjustment from governance mode. */
  readonly A_mode: number;

  /** Adjustment from drift. */
  readonly A_drift: number;

  /** Adjustment from confidence debt. */
  readonly A_debt: number;

  /** Adjustment from value signal. */
  readonly A_value: number;

  /** Adjustment from regret signal. */
  readonly A_regret: number;

  /** Whether the result was clamped. */
  readonly clamped: boolean;
}

// ---------------------------------------------------------------------------
// Mode adjustment table
// ---------------------------------------------------------------------------

/**
 * Maps each governance mode to its threshold adjustment.
 *
 * Negative values make it *easier* to allow (lower threshold).
 * Positive values make it *harder* to allow (higher threshold).
 */
const MODE_ADJUSTMENTS: Readonly<Record<GovernanceMode, number>> = {
  SHADOW: 0,
  BOOTSTRAP: 0.05,
  NORMAL: 0,
  AGGRESSIVE: -0.1,
  DEFENSIVE: 0.15,
  QUARANTINE: 0.3,
  HALT: 0.5,
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<ThresholdConfig> = {
  T_base: 0.5,
  T_min: 0.05,
  T_max: 0.95,
  drift_sensitivity: 0.5,
  debt_sensitivity: 0.3,
  regret_max: 0.2,
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Clamp a value to the range [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute the mode adjustment for a given governance mode.
 */
export function getModeAdjustment(mode: GovernanceMode): number {
  return MODE_ADJUSTMENTS[mode] ?? 0;
}

/**
 * Compute the effective threshold with a full breakdown.
 *
 * T_eff = clamp(T_base + A_mode + A_drift + A_debt + A_value + A_regret, [T_min, T_max])
 */
export function computeThresholdDetailed(
  input: ThresholdInput,
  config?: ThresholdConfig,
): ThresholdBreakdown {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const T_base = cfg.T_base;
  const A_mode = getModeAdjustment(input.mode);
  const A_drift = input.drift_score * cfg.drift_sensitivity;
  const A_debt = input.confidence_debt * cfg.debt_sensitivity;
  const A_value = input.value_adjustment ?? 0;
  const A_regret = clamp(input.regret_adjustment ?? 0, -cfg.regret_max, cfg.regret_max);

  const raw = T_base + A_mode + A_drift + A_debt + A_value + A_regret;
  const T_eff = clamp(raw, cfg.T_min, cfg.T_max);
  const clamped = T_eff !== raw;

  return {
    T_eff,
    T_base,
    A_mode,
    A_drift,
    A_debt,
    A_value,
    A_regret,
    clamped,
  };
}

/**
 * Compute the effective threshold (scalar convenience wrapper).
 *
 * T_eff = clamp(T_base + A_mode + A_drift + A_debt + A_value + A_regret, [T_min, T_max])
 */
export function computeThreshold(
  input: ThresholdInput,
  config?: ThresholdConfig,
): number {
  return computeThresholdDetailed(input, config).T_eff;
}
