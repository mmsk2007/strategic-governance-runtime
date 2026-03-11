/**
 * Provenance subsystem barrel export.
 *
 * Provides cryptographic provenance, Merkle tree receipts, trusted
 * timestamping, and human confirmation capabilities.
 */

export { ProvenanceProvider, SoftwareProvenanceProvider } from './provenance-interface.js';
export type {
  ProvenanceRecord,
  TrustedTimestamp,
} from './provenance-interface.js';

export { MerkleReceipt } from './merkle-receipt.js';
export type { MerkleTree, MerkleProof } from './merkle-receipt.js';

export { MockTimestampAuthority } from './timestamp-authority.js';
export type { TimestampAuthority } from './timestamp-authority.js';

export { HumanConfirmation } from './human-confirmation.js';
export type {
  HumanConfirmationRecord,
  CreateConfirmationParams,
  ConfirmationMethod,
  ConfirmationStrength,
  ValidationResult,
} from './human-confirmation.js';
