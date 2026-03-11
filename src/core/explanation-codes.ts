/**
 * Explanation code utilities for Strategic Governance Runtime v2.
 *
 * Every governance decision carries an explanation code that describes
 * *why* the decision was made. Codes are organized into five levels:
 *
 *   L1 — Hard policy / safety blocks (highest severity)
 *   L2 — Trust and verification concerns
 *   L3 — Drift and regime-change signals
 *   L4 — Soft constraints (rate-limits, size reduction, safe defaults)
 *   L5 — Informational / pass-through (lowest severity)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Severity level of an explanation code (1 = most severe). */
export type ExplanationLevel = 1 | 2 | 3 | 4 | 5;

/**
 * String literal union of every known explanation code.
 */
export type ExplanationCode =
  // Level 1 — hard blocks
  | "L1_POLICY_VIOLATION"
  | "L1_SAFETY_BLOCK"
  // Level 2 — trust / verification
  | "L2_LOW_TRUST"
  | "L2_HIGH_DEBT"
  | "L2_UNVERIFIED"
  // Level 3 — drift / regime
  | "L3_DRIFT_DETECTED"
  | "L3_REGIME_CHANGE"
  // Level 4 — soft constraints
  | "L4_SIZE_REDUCED"
  | "L4_RATE_LIMITED"
  | "L4_SAFE_DEFAULT"
  // Level 5 — informational
  | "L5_ALLOW"
  | "L5_SHADOW"
  | "L5_BYPASS"
  | "L5_INFO";

/**
 * Metadata associated with an explanation code.
 */
export interface ExplanationCodeEntry {
  /** The canonical code string. */
  readonly code: ExplanationCode;

  /** Severity level (1–5). */
  readonly level: ExplanationLevel;

  /** Human-readable description of the code. */
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Complete registry of explanation codes, keyed by code string.
 */
export const EXPLANATION_CODES: Readonly<Record<ExplanationCode, ExplanationCodeEntry>> = {
  // Level 1 — hard blocks
  L1_POLICY_VIOLATION: {
    code: "L1_POLICY_VIOLATION",
    level: 1,
    description: "The proposed action violates a mandatory governance policy.",
  },
  L1_SAFETY_BLOCK: {
    code: "L1_SAFETY_BLOCK",
    level: 1,
    description: "The proposed action was blocked by a safety constraint.",
  },

  // Level 2 — trust / verification
  L2_LOW_TRUST: {
    code: "L2_LOW_TRUST",
    level: 2,
    description: "The agent's trust score is below the required threshold.",
  },
  L2_HIGH_DEBT: {
    code: "L2_HIGH_DEBT",
    level: 2,
    description: "The agent has accumulated excessive confidence debt.",
  },
  L2_UNVERIFIED: {
    code: "L2_UNVERIFIED",
    level: 2,
    description: "The agent or action could not be verified against authority records.",
  },

  // Level 3 — drift / regime
  L3_DRIFT_DETECTED: {
    code: "L3_DRIFT_DETECTED",
    level: 3,
    description: "Behavioral drift has been detected relative to the baseline.",
  },
  L3_REGIME_CHANGE: {
    code: "L3_REGIME_CHANGE",
    level: 3,
    description: "A regime change has been detected in the operating environment.",
  },

  // Level 4 — soft constraints
  L4_SIZE_REDUCED: {
    code: "L4_SIZE_REDUCED",
    level: 4,
    description: "The action scope was reduced to fit within safe bounds.",
  },
  L4_RATE_LIMITED: {
    code: "L4_RATE_LIMITED",
    level: 4,
    description: "The action was rate-limited to prevent resource exhaustion.",
  },
  L4_SAFE_DEFAULT: {
    code: "L4_SAFE_DEFAULT",
    level: 4,
    description: "A safe default was applied in place of the proposed parameters.",
  },

  // Level 5 — informational
  L5_ALLOW: {
    code: "L5_ALLOW",
    level: 5,
    description: "The action was allowed without modification.",
  },
  L5_SHADOW: {
    code: "L5_SHADOW",
    level: 5,
    description: "The action was observed in shadow mode; no intervention applied.",
  },
  L5_BYPASS: {
    code: "L5_BYPASS",
    level: 5,
    description: "The action bypassed governance checks via an authorized override.",
  },
  L5_INFO: {
    code: "L5_INFO",
    level: 5,
    description: "Informational note; no governance action was required.",
  },
} as const;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Look up the metadata for an explanation code.
 *
 * @throws {Error} if the code is not in the registry.
 */
export function getExplanationCode(code: ExplanationCode): ExplanationCodeEntry {
  const entry = EXPLANATION_CODES[code];
  if (!entry) {
    throw new Error(`Unknown explanation code: ${code}`);
  }
  return entry;
}

/**
 * Return the severity level (1–5) for a code.
 */
export function getExplanationLevel(code: ExplanationCode): ExplanationLevel {
  return getExplanationCode(code).level;
}

/**
 * Return the human-readable description for a code.
 */
export function getExplanationDescription(code: ExplanationCode): string {
  return getExplanationCode(code).description;
}

/**
 * Return all codes at a given severity level.
 */
export function getCodesByLevel(level: ExplanationLevel): readonly ExplanationCodeEntry[] {
  return Object.values(EXPLANATION_CODES).filter((entry) => entry.level === level);
}

/**
 * Return true if code `a` is more severe (lower level number) than code `b`.
 */
export function isMoreSevere(a: ExplanationCode, b: ExplanationCode): boolean {
  return getExplanationLevel(a) < getExplanationLevel(b);
}
