/**
 * DelegationChain — traversal and validation of chains of delegation envelopes.
 *
 * A delegation chain is an ordered sequence of envelopes where each
 * delegatee of envelope N is the delegator of envelope N+1.
 * The chain enforces non-expandability: scope must narrow (or stay equal)
 * at each link, depth limits must be respected, and cycles are forbidden.
 */

import type { DecisionRight, AuthorityScope } from '../types/index.js';
import type { Envelope } from './delegation-envelope.js';
import { DelegationEnvelope } from './delegation-envelope.js';

export class DelegationChain {
  private readonly envelopes: ReadonlyArray<Envelope>;

  constructor(envelopes: Envelope[]) {
    this.envelopes = Object.freeze([...envelopes]);
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Validate the entire delegation chain.
   *
   * Checks:
   * 1. Each individual envelope is valid.
   * 2. Linkage: delegatee of envelope[i] === delegator of envelope[i+1].
   * 3. Scope narrows (never expands) at each link.
   * 4. Depth limits are respected.
   * 5. No circular delegations.
   */
  validate(signingKey?: string): { valid: boolean; reason?: string } {
    if (this.envelopes.length === 0) {
      return { valid: false, reason: 'Empty delegation chain' };
    }

    // Check for circular delegations (same principal appears as delegator twice)
    const seen = new Set<string>();
    for (const env of this.envelopes) {
      if (seen.has(env.delegator)) {
        return {
          valid: false,
          reason: `Circular delegation detected: ${env.delegator} appears more than once as delegator`,
        };
      }
      seen.add(env.delegator);
      // Also check if any delegatee is already a delegator earlier in the chain
      if (seen.has(env.delegatee) && env.delegatee !== this.envelopes[this.envelopes.length - 1]?.delegatee) {
        return {
          valid: false,
          reason: `Circular delegation detected: ${env.delegatee} creates a cycle`,
        };
      }
    }

    for (let i = 0; i < this.envelopes.length; i++) {
      const env = this.envelopes[i]!;

      // Validate individual envelope
      const envResult = DelegationEnvelope.validate(env, signingKey);
      if (!envResult.valid) {
        return {
          valid: false,
          reason: `Envelope ${i} invalid: ${envResult.reason}`,
        };
      }

      // Depth limit: chain position must not exceed max_sub_delegation_depth
      // of the root envelope
      if (i > 0) {
        const root = this.envelopes[0]!;
        if (i >= root.max_sub_delegation_depth + 1) {
          return {
            valid: false,
            reason: `Chain depth ${i} exceeds root max_sub_delegation_depth ${root.max_sub_delegation_depth}`,
          };
        }
      }

      // Check each envelope's own depth limit
      if (i > env.max_sub_delegation_depth) {
        return {
          valid: false,
          reason: `Chain depth ${i} exceeds envelope max_sub_delegation_depth ${env.max_sub_delegation_depth}`,
        };
      }

      // Linkage check
      if (i > 0) {
        const prev = this.envelopes[i - 1]!;
        if (prev.delegatee !== env.delegator) {
          return {
            valid: false,
            reason: `Broken chain at link ${i}: expected delegator '${prev.delegatee}', got '${env.delegator}'`,
          };
        }

        // Scope must narrow (or stay equal)
        if (!DelegationChain.isSubScope(env.scope_restriction, prev.scope_restriction)) {
          return {
            valid: false,
            reason: `Scope expanded at link ${i}: child scope is not a subset of parent scope`,
          };
        }

        // Rights must narrow (or stay equal)
        const parentRights = new Set(prev.rights_granted);
        for (const right of env.rights_granted) {
          if (!parentRights.has(right)) {
            return {
              valid: false,
              reason: `Right '${right}' at link ${i} not present in parent envelope`,
            };
          }
        }

        // max_sub_delegation_depth must not exceed parent's depth - 1
        if (env.max_sub_delegation_depth > prev.max_sub_delegation_depth - 1) {
          return {
            valid: false,
            reason: `max_sub_delegation_depth at link ${i} exceeds parent allowance`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Compute the effective scope: the intersection of all scopes in the chain.
   *
   * The effective scope is the most restrictive scope that applies to the
   * final delegatee. Since scopes must narrow at each link, this is the
   * last envelope's scope (assuming the chain is valid).
   */
  getEffectiveScope(): AuthorityScope {
    if (this.envelopes.length === 0) {
      return { domain: '', resource_pattern: '' };
    }

    // Walk the chain and intersect scopes
    let effective = this.envelopes[0]!.scope_restriction;
    for (let i = 1; i < this.envelopes.length; i++) {
      effective = DelegationChain.intersectScope(effective, this.envelopes[i]!.scope_restriction);
    }
    return effective;
  }

  /**
   * Return the depth (number of links) in the chain.
   */
  getDepth(): number {
    return this.envelopes.length;
  }

  // ── Static helpers ──────────────────────────────────────────────

  /**
   * Check whether `child` scope is contained within `parent` scope.
   *
   * A child scope is a sub-scope of the parent when:
   * - The domain matches exactly.
   * - The child resource_pattern is equal to or more specific than the parent.
   *   (A parent pattern ending with '*' matches any child that starts with
   *    the parent's prefix.)
   */
  static isSubScope(child: AuthorityScope, parent: AuthorityScope): boolean {
    // Domain must match
    if (child.domain !== parent.domain) {
      return false;
    }

    // Exact match
    if (child.resource_pattern === parent.resource_pattern) {
      return true;
    }

    // Wildcard containment: parent "prod/*" contains child "prod/db"
    if (parent.resource_pattern.endsWith('*')) {
      const prefix = parent.resource_pattern.slice(0, -1);
      return child.resource_pattern.startsWith(prefix);
    }

    return false;
  }

  /**
   * Compute the intersection of two scopes.
   * If domains differ, returns an empty scope.
   * Otherwise picks the more specific resource pattern.
   */
  private static intersectScope(a: AuthorityScope, b: AuthorityScope): AuthorityScope {
    if (a.domain !== b.domain) {
      return { domain: '', resource_pattern: '' };
    }

    // If one contains the other, pick the narrower one
    if (DelegationChain.isSubScope(b, a)) {
      return b;
    }
    if (DelegationChain.isSubScope(a, b)) {
      return a;
    }

    // No containment relationship — intersection is empty
    return { domain: a.domain, resource_pattern: '' };
  }
}
