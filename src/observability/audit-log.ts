/**
 * AuditLog - Append-only structured audit log for the Strategic Governance Runtime.
 *
 * Provides immutable, queryable records of all governance events
 * with support for filtering by time range, event type, decision, and principal.
 */

import { randomUUID } from 'node:crypto';

/** A single entry in the audit log. */
export interface AuditEntry {
  readonly entry_id: string;
  readonly timestamp: number;
  readonly event_type: string;
  readonly decision_id?: string;
  readonly principal_id?: string;
  readonly epoch_id?: string;
  readonly details: Record<string, unknown>;
  readonly parent_entry_id?: string;
}

/** Filter criteria for querying audit entries. */
export interface AuditFilter {
  from?: number;
  to?: number;
  event_type?: string;
  decision_id?: string;
  principal_id?: string;
}

/**
 * Append-only structured audit log.
 *
 * Entries are immutable once appended and can be queried
 * by various governance-relevant criteria.
 */
export class AuditLog {
  private readonly entries: AuditEntry[] = [];

  /**
   * Append a new entry to the audit log.
   * The entry_id is assigned automatically via crypto.randomUUID().
   */
  append(entry: Omit<AuditEntry, 'entry_id' | 'timestamp'> & { entry_id?: string; timestamp?: number }): void {
    const sealed: AuditEntry = {
      entry_id: entry.entry_id ?? randomUUID(),
      timestamp: entry.timestamp ?? Date.now(),
      event_type: entry.event_type,
      decision_id: entry.decision_id,
      principal_id: entry.principal_id,
      epoch_id: entry.epoch_id,
      details: Object.freeze({ ...entry.details }) as Record<string, unknown>,
      parent_entry_id: entry.parent_entry_id,
    };
    this.entries.push(sealed);
  }

  /**
   * Query the audit log using the provided filter.
   * All filter fields are optional; unset fields match everything.
   */
  query(filter: AuditFilter): AuditEntry[] {
    return this.entries.filter((entry) => {
      if (filter.from !== undefined && entry.timestamp < filter.from) return false;
      if (filter.to !== undefined && entry.timestamp > filter.to) return false;
      if (filter.event_type !== undefined && entry.event_type !== filter.event_type) return false;
      if (filter.decision_id !== undefined && entry.decision_id !== filter.decision_id) return false;
      if (filter.principal_id !== undefined && entry.principal_id !== filter.principal_id) return false;
      return true;
    });
  }

  /** Retrieve all audit entries associated with a specific decision. */
  getByDecisionId(decisionId: string): AuditEntry[] {
    return this.entries.filter((entry) => entry.decision_id === decisionId);
  }

  /** Return the total number of entries in the audit log. */
  size(): number {
    return this.entries.length;
  }
}
