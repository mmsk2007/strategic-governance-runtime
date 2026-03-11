/**
 * Provenance types for Strategic Governance Runtime v2.
 *
 * Provenance captures cryptographic and hardware-backed evidence
 * that decisions were made correctly, at a specific time, and with
 * appropriate human oversight. These types support the audit trail
 * and non-repudiation guarantees.
 */

/**
 * Hash algorithm used for Merkle tree construction.
 */
export type HashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512" | "BLAKE3";

/**
 * A node in a Merkle tree, used to prove inclusion of a decision
 * artifact in an immutable audit log.
 */
export interface MerkleNode {
  /** Hex-encoded hash of this node */
  readonly hash: string;

  /** Position in the tree: "left" or "right" relative to its sibling */
  readonly position: "left" | "right";
}

/**
 * A Merkle inclusion receipt proving that a specific decision artifact
 * is part of the tamper-evident audit log.
 */
export interface MerkleReceipt {
  /** Hex-encoded hash of the leaf (the decision artifact) */
  readonly leaf_hash: string;

  /** Hex-encoded Merkle root at the time of inclusion */
  readonly merkle_root: string;

  /** Proof path from leaf to root */
  readonly proof: ReadonlyArray<MerkleNode>;

  /** Hash algorithm used to compute the tree */
  readonly algorithm: HashAlgorithm;

  /** Zero-based index of the leaf in the tree */
  readonly leaf_index: number;

  /** Total number of leaves in the tree at the time of receipt */
  readonly tree_size: number;

  /** ISO-8601 timestamp when the receipt was generated */
  readonly generated_at: string;
}

/**
 * Source of a trusted timestamp.
 */
export type TimestampSource = "rfc3161" | "blockchain" | "hardware_clock" | "ntp_verified";

/**
 * A timestamp backed by a trusted external authority, providing
 * non-repudiable evidence of when an event occurred.
 */
export interface TrustedTimestamp {
  /** ISO-8601 timestamp value */
  readonly timestamp: string;

  /** Source that provided the trusted timestamp */
  readonly source: TimestampSource;

  /** Identifier of the timestamp authority or service */
  readonly authority_id: string;

  /** Cryptographic signature from the timestamp authority */
  readonly signature: string;

  /** Certificate chain or reference for verifying the signature */
  readonly certificate_ref: string;

  /** Accuracy bound in milliseconds (how precise the timestamp is) */
  readonly accuracy_ms: number;
}

/**
 * Strength of human confirmation, from weakest to strongest.
 *
 * - implicit:     Human was present but did not explicitly confirm.
 * - explicit:     Human explicitly clicked/typed confirmation.
 * - multi_factor: Human confirmed via multiple authentication factors.
 * - biometric:    Human confirmed via biometric verification.
 * - notarized:    Human confirmation was witnessed and notarized.
 */
export type ConfirmationStrength =
  | "implicit"
  | "explicit"
  | "multi_factor"
  | "biometric"
  | "notarized";

/**
 * Evidence that a human reviewed and confirmed an action before
 * the governance runtime processed it.
 */
export interface HumanConfirmation {
  /** Unique identifier for this confirmation event */
  readonly confirmation_id: string;

  /** ID of the human principal who confirmed */
  readonly confirmed_by: string;

  /** Strength of the confirmation */
  readonly strength: ConfirmationStrength;

  /** ISO-8601 timestamp when the confirmation was given */
  readonly confirmed_at: string;

  /** ISO-8601 timestamp when this confirmation expires */
  readonly expires_at: string;

  /** Scope of what was confirmed (action description or reference) */
  readonly scope: string;

  /** Cryptographic signature proving the confirmation */
  readonly signature: string;

  /** Optional free-text note from the confirming human */
  readonly note: string | null;
}

/**
 * Combined provenance record attached to a decision for
 * complete audit trail support.
 */
export interface ProvenanceRecord {
  /** Merkle receipt proving log inclusion */
  readonly merkle_receipt: MerkleReceipt;

  /** Trusted timestamp for the decision */
  readonly trusted_timestamp: TrustedTimestamp;

  /** Human confirmation, if one was provided */
  readonly human_confirmation: HumanConfirmation | null;

  /** Decision ID this provenance record is bound to */
  readonly decision_id: string;
}
