/**
 * AuthorityStateMachine - Formal state machine for authority lifecycle.
 *
 * Defines the valid states an authority principal can be in and the
 * legal transitions between them, ensuring governance invariants are
 * maintained.
 */

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Authority lifecycle states. */
export type AuthorityStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'ESCALATED';

/** Record of a single state transition. */
export interface AuthorityTransition {
  readonly from: AuthorityStatus;
  readonly to: AuthorityStatus;
  readonly trigger: string;
  readonly timestamp: string;
  readonly epoch_id: string;
  readonly initiated_by: string;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Transition table
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: ReadonlyMap<AuthorityStatus, ReadonlySet<AuthorityStatus>> = new Map<
  AuthorityStatus,
  ReadonlySet<AuthorityStatus>
>([
  ['PENDING_ACTIVATION', new Set<AuthorityStatus>(['ACTIVE'])],
  [
    'ACTIVE',
    new Set<AuthorityStatus>(['SUSPENDED', 'REVOKED', 'EXPIRED', 'ESCALATED']),
  ],
  ['SUSPENDED', new Set<AuthorityStatus>(['ACTIVE', 'REVOKED'])],
  ['ESCALATED', new Set<AuthorityStatus>(['ACTIVE', 'SUSPENDED'])],
  ['REVOKED', new Set<AuthorityStatus>()],
  ['EXPIRED', new Set<AuthorityStatus>()],
]);

// ---------------------------------------------------------------------------
// AuthorityStateMachine
// ---------------------------------------------------------------------------

export class AuthorityStateMachine {
  private readonly history: AuthorityTransition[] = [];

  /**
   * Execute a state transition.
   *
   * @param from        - Current state.
   * @param to          - Desired next state.
   * @param trigger     - Free-form trigger description.
   * @param initiatedBy - Principal id that initiated the transition.
   * @param reason      - Human-readable reason.
   * @returns The recorded AuthorityTransition.
   * @throws If the transition is not allowed.
   */
  transition(
    from: AuthorityStatus,
    to: AuthorityStatus,
    trigger: string,
    initiatedBy: string,
    reason: string,
  ): AuthorityTransition {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid authority transition: ${from} -> ${to}. ` +
          `Valid targets from ${from}: [${[...this.getValidTransitions(from)].join(', ')}]`,
      );
    }

    const record: AuthorityTransition = {
      from,
      to,
      trigger,
      timestamp: new Date().toISOString(),
      epoch_id: '', // Caller should set via EpochManager; empty default.
      initiated_by: initiatedBy,
      reason,
    };

    this.history.push(record);
    return record;
  }

  /**
   * Check whether a transition from `from` to `to` is valid.
   */
  canTransition(from: AuthorityStatus, to: AuthorityStatus): boolean {
    const targets = VALID_TRANSITIONS.get(from);
    if (!targets) return false;
    return targets.has(to);
  }

  /**
   * Return the set of states reachable from `from`.
   */
  getValidTransitions(from: AuthorityStatus): AuthorityStatus[] {
    const targets = VALID_TRANSITIONS.get(from);
    if (!targets) return [];
    return [...targets];
  }

  /**
   * Return the full transition history (append-only).
   */
  getHistory(): ReadonlyArray<AuthorityTransition> {
    return [...this.history];
  }
}
