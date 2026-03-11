/**
 * Policy engine for Strategic Governance Runtime v2.
 *
 * The PolicyEngine evaluates a set of policy rules against a governance
 * input and returns the first matching veto (by priority order), or null
 * if no rule triggers.
 */

import type { ExplanationCode } from "./explanation-codes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal governance input subset needed by policy rules.
 * We accept `Record<string, unknown>` so callers can pass the full
 * GovernanceInput without coupling to its exact shape.
 */
export type PolicyInput = Record<string, unknown>;

/**
 * A single policy rule.
 */
export interface PolicyRule {
  /** Unique identifier for the rule. */
  readonly id: string;

  /** Human-readable name. */
  readonly name: string;

  /**
   * Condition function. Returns `true` when the rule should trigger a veto.
   * Must be synchronous and side-effect-free.
   */
  readonly condition: (input: PolicyInput) => boolean;

  /** Explanation code to attach when this rule fires. */
  readonly explanation_code: ExplanationCode;

  /**
   * Priority — lower numbers are evaluated first.
   * Rules with equal priority are evaluated in insertion order.
   */
  readonly priority: number;
}

/**
 * The result of a policy veto.
 */
export interface PolicyVeto {
  /** ID of the rule that triggered the veto. */
  readonly rule_id: string;

  /** Explanation code from the matched rule. */
  readonly explanation_code: ExplanationCode;

  /** Human-readable reason string. */
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// PolicyEngine
// ---------------------------------------------------------------------------

/**
 * Evaluates governance inputs against an ordered set of policy rules.
 *
 * Rules are sorted by priority (ascending) before evaluation.
 * The first rule whose `condition` returns `true` produces a
 * {@link PolicyVeto}; if no rule matches, `null` is returned.
 */
export class PolicyEngine {
  private readonly rules: PolicyRule[];

  /**
   * @param rules — initial set of policy rules (will be copied and sorted).
   */
  constructor(rules: readonly PolicyRule[] = []) {
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add a rule to the engine. The internal list is re-sorted by priority.
   */
  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a rule by ID. Returns `true` if a rule was removed.
   */
  removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  /**
   * Return a snapshot of the current rules (sorted by priority).
   */
  getRules(): readonly PolicyRule[] {
    return [...this.rules];
  }

  /**
   * Evaluate the input against all rules in priority order.
   *
   * @returns The first matching {@link PolicyVeto}, or `null` if no rule fires.
   */
  evaluate(input: PolicyInput): PolicyVeto | null {
    for (const rule of this.rules) {
      try {
        if (rule.condition(input)) {
          return {
            rule_id: rule.id,
            explanation_code: rule.explanation_code,
            reason: `Policy rule "${rule.name}" (${rule.id}) triggered.`,
          };
        }
      } catch {
        // A failing condition is treated as non-matching.
        // In production, the observability layer would log this.
        continue;
      }
    }
    return null;
  }

  /**
   * Evaluate all rules and return every veto (not just the first).
   * Useful for diagnostics and audit trails.
   */
  evaluateAll(input: PolicyInput): readonly PolicyVeto[] {
    const vetoes: PolicyVeto[] = [];
    for (const rule of this.rules) {
      try {
        if (rule.condition(input)) {
          vetoes.push({
            rule_id: rule.id,
            explanation_code: rule.explanation_code,
            reason: `Policy rule "${rule.name}" (${rule.id}) triggered.`,
          });
        }
      } catch {
        continue;
      }
    }
    return vetoes;
  }
}
