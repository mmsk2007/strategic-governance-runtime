/**
 * ScopeResolver — computes effective scope from principal scope and
 * an optional delegation chain.
 *
 * The resolved scope is always the intersection of the principal's
 * own scope and every scope restriction in the delegation chain.
 */

import type { AuthorityScope, AuthorityCeiling } from '../types/index.js';
import { DelegationChain } from './delegation-chain.js';

export class ScopeResolver {
  /**
   * Resolve the effective scope for a principal, optionally constrained
   * by a delegation chain.
   *
   * If no delegation chain is provided, returns the principal scope as-is.
   * Otherwise returns the intersection of the principal scope and the
   * chain's effective scope.
   */
  resolve(
    principalScope: AuthorityScope,
    delegationChain?: DelegationChain,
  ): AuthorityScope {
    if (!delegationChain) {
      return principalScope;
    }

    const chainScope = delegationChain.getEffectiveScope();
    return this.intersectScopes(principalScope, chainScope);
  }

  /**
   * Compute the intersection of two authority scopes.
   *
   * - If domains differ, the intersection is empty.
   * - Otherwise the narrower resource pattern is selected.
   */
  intersectScopes(a: AuthorityScope, b: AuthorityScope): AuthorityScope {
    if (a.domain !== b.domain) {
      return { domain: '', resource_pattern: '' };
    }

    if (DelegationChain.isSubScope(b, a)) {
      return b;
    }
    if (DelegationChain.isSubScope(a, b)) {
      return a;
    }

    // No containment — empty intersection
    return { domain: a.domain, resource_pattern: '' };
  }

  /**
   * Check whether `scope` is within the boundaries defined by `ceiling`.
   *
   * A scope is within the ceiling when:
   * - The scope domain is non-empty (meaningful).
   * - The scope resource_pattern is non-empty (meaningful).
   * - The ceiling's max_scope_breadth >= 1 (at least one scope allowed).
   */
  isWithinCeiling(scope: AuthorityScope, ceiling: AuthorityCeiling): boolean {
    // An empty scope (domain or resource_pattern is '') is trivially within
    // any ceiling since it grants no access.
    if (!scope.domain || !scope.resource_pattern) {
      return true;
    }

    // The ceiling must allow at least one scope
    if (ceiling.max_scope_breadth < 1) {
      return false;
    }

    return true;
  }
}
