/**
 * Observability subsystem barrel export.
 *
 * Provides audit logging, mutation lineage tracking, forensic event
 * emission, and observability contract enforcement.
 */

export { AuditLog } from './audit-log.js';
export type { AuditEntry, AuditFilter } from './audit-log.js';

export { LineageTracker } from './lineage-tracker.js';
export type { MutationRecord, MutationOperation } from './lineage-tracker.js';

export { ForensicEmitter, FORENSIC_EVENT_TYPES } from './forensic-emitter.js';
export type { ForensicEvent, ForensicSeverity, ForensicListener } from './forensic-emitter.js';

export { ObservabilityContract } from './observability-contract.js';
export type { ComplianceResult, StoredArtifact } from './observability-contract.js';
