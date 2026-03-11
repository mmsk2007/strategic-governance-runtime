/**
 * ObservabilityContract - Enforces that decisions produce required observability artifacts.
 *
 * Every governance decision must leave a complete audit trail consisting of:
 * 1. An audit log entry for the decision
 * 2. A stored decision artifact
 * 3. A forensic event emission
 *
 * This contract verifies all three obligations are met.
 */

import type { AuditLog } from './audit-log.js';
import type { LineageTracker } from './lineage-tracker.js';
import type { ForensicEmitter } from './forensic-emitter.js';

/** Result of an observability compliance check. */
export interface ComplianceResult {
  readonly compliant: boolean;
  readonly missing: string[];
}

/** A decision artifact that has been stored. */
export interface StoredArtifact {
  readonly decision_id: string;
  readonly artifact_hash: string;
  readonly stored_at: number;
}

/**
 * Enforces that decisions produce required observability outputs.
 *
 * Checks three conditions for compliance:
 * - An audit entry exists for the decision
 * - The decision artifact is stored
 * - A forensic event was emitted for the decision
 */
export class ObservabilityContract {
  private readonly artifacts = new Map<string, StoredArtifact>();

  constructor(
    private readonly auditLog: AuditLog,
    private readonly lineageTracker: LineageTracker,
    private readonly forensicEmitter: ForensicEmitter,
  ) {}

  /** Store an artifact for later compliance checks. */
  storeArtifact(artifact: StoredArtifact): void {
    this.artifacts.set(artifact.decision_id, artifact);
  }

  /**
   * Enforce observability compliance for a given decision.
   *
   * @param decisionId - The decision to check
   * @param artifact - Optional artifact to verify (if not using storeArtifact)
   * @returns Compliance result with any missing obligations
   */
  enforce(decisionId: string, artifact?: StoredArtifact): ComplianceResult {
    const missing: string[] = [];

    // Check 1: Audit entry exists for the decision.
    const auditEntries = this.auditLog.getByDecisionId(decisionId);
    if (auditEntries.length === 0) {
      missing.push('audit_entry');
    }

    // Check 2: Artifact is stored.
    const storedArtifact = artifact ?? this.artifacts.get(decisionId);
    if (!storedArtifact) {
      missing.push('artifact');
    }

    // Check 3: Forensic event was emitted.
    const events = this.forensicEmitter.getEmittedEvents();
    const hasForensicEvent = events.some(
      (e) => e.payload['decision_id'] === decisionId,
    );
    if (!hasForensicEvent) {
      missing.push('forensic_event');
    }

    return {
      compliant: missing.length === 0,
      missing,
    };
  }
}
