/**
 * LineageTracker - Tracks mutation lineage linking mutations back to decisions.
 *
 * Every state mutation in the governance runtime is recorded with its causal
 * relationship to the originating decision and any parent mutations.
 */

import { randomUUID } from 'node:crypto';

/** The type of mutation operation performed. */
export type MutationOperation = 'create' | 'update' | 'delete';

/** A record of a single state mutation with its lineage information. */
export interface MutationRecord {
  readonly mutation_id: string;
  readonly decision_id: string;
  readonly timestamp: number;
  readonly target: string;
  readonly operation: MutationOperation;
  readonly before_hash?: string;
  readonly after_hash: string;
  readonly causal_parent_id?: string;
}

/**
 * Tracks mutation lineage linking mutations back to decisions.
 *
 * Supports forward lookups (decision -> mutations) and backward
 * chain traversal (mutation -> causal parent chain).
 */
export class LineageTracker {
  private readonly mutations: MutationRecord[] = [];
  private readonly byDecision = new Map<string, MutationRecord[]>();
  private readonly byMutationId = new Map<string, MutationRecord>();

  /**
   * Record a new mutation. If mutation_id or timestamp are not provided,
   * they are generated automatically.
   */
  recordMutation(
    mutation: Omit<MutationRecord, 'mutation_id' | 'timestamp'> & { mutation_id?: string; timestamp?: number },
  ): void {
    const record: MutationRecord = {
      mutation_id: mutation.mutation_id ?? randomUUID(),
      decision_id: mutation.decision_id,
      timestamp: mutation.timestamp ?? Date.now(),
      target: mutation.target,
      operation: mutation.operation,
      before_hash: mutation.before_hash,
      after_hash: mutation.after_hash,
      causal_parent_id: mutation.causal_parent_id,
    };

    this.mutations.push(record);
    this.byMutationId.set(record.mutation_id, record);

    let decisionList = this.byDecision.get(record.decision_id);
    if (!decisionList) {
      decisionList = [];
      this.byDecision.set(record.decision_id, decisionList);
    }
    decisionList.push(record);
  }

  /** Retrieve all mutations originating from a specific decision. */
  getLineage(decisionId: string): MutationRecord[] {
    return this.byDecision.get(decisionId) ?? [];
  }

  /**
   * Walk the causal parent chain starting from the given mutation ID.
   * Returns the chain from the specified mutation back to the root cause,
   * ordered from the given mutation (first) to the earliest ancestor (last).
   */
  getMutationChain(mutationId: string): MutationRecord[] {
    const chain: MutationRecord[] = [];
    let current = this.byMutationId.get(mutationId);

    while (current) {
      chain.push(current);
      if (!current.causal_parent_id) break;
      current = this.byMutationId.get(current.causal_parent_id);
    }

    return chain;
  }
}
