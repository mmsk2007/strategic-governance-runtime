/**
 * HumanConfirmation - Proof-of-human-confirmation for governance decisions.
 *
 * Manages creation and validation of records that prove a human principal
 * reviewed and confirmed an action. Supports multiple confirmation methods
 * (FIDO2, OTP, biometric, manual review) with varying strength levels.
 */

import { randomUUID, createHash } from 'node:crypto';

/** Method used to obtain human confirmation. */
export type ConfirmationMethod = 'fido2' | 'otp' | 'biometric' | 'manual_review';

/** Strength level of the human confirmation. */
export type ConfirmationStrength = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/** A record proving that a human confirmed a governance action. */
export interface HumanConfirmationRecord {
  readonly confirmation_id: string;
  readonly principal_id: string;
  readonly method: ConfirmationMethod;
  readonly strength: ConfirmationStrength;
  readonly device_binding?: string;
  readonly confirmed_at: number;
  readonly expires_at: number;
  readonly challenge_hash: string;
  readonly response_hash: string;
  readonly override_lineage?: string[];
}

/** Parameters for creating a human confirmation record. */
export interface CreateConfirmationParams {
  principal_id: string;
  method: ConfirmationMethod;
  strength?: ConfirmationStrength;
  device_binding?: string;
  ttl_ms?: number;
  challenge: string;
  response: string;
  override_lineage?: string[];
}

/** Result of validating a human confirmation record. */
export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Default strength mapping for each confirmation method.
 */
const METHOD_STRENGTH: Record<ConfirmationMethod, ConfirmationStrength> = {
  manual_review: 'LOW',
  otp: 'MEDIUM',
  fido2: 'HIGH',
  biometric: 'VERY_HIGH',
};

/** Default TTL for confirmation records: 30 minutes. */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/**
 * HumanConfirmation - creates and validates proof-of-human-confirmation records.
 *
 * Minimum required strength can be configured at construction time.
 * Records that do not meet the minimum strength are considered invalid.
 */
export class HumanConfirmation {
  private readonly minimumStrength: ConfirmationStrength;

  private static readonly STRENGTH_ORDER: Record<ConfirmationStrength, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    VERY_HIGH: 3,
  };

  constructor(options?: { minimumStrength?: ConfirmationStrength }) {
    this.minimumStrength = options?.minimumStrength ?? 'LOW';
  }

  /**
   * Create a new human confirmation record.
   *
   * The challenge and response are hashed (SHA-256) before storage
   * so that raw secrets are not retained.
   */
  create(params: CreateConfirmationParams): HumanConfirmationRecord {
    const now = Date.now();
    const strength = params.strength ?? METHOD_STRENGTH[params.method];

    return {
      confirmation_id: randomUUID(),
      principal_id: params.principal_id,
      method: params.method,
      strength,
      device_binding: params.device_binding,
      confirmed_at: now,
      expires_at: now + (params.ttl_ms ?? DEFAULT_TTL_MS),
      challenge_hash: createHash('sha256').update(params.challenge).digest('hex'),
      response_hash: createHash('sha256').update(params.response).digest('hex'),
      override_lineage: params.override_lineage,
    };
  }

  /**
   * Validate a human confirmation record.
   *
   * Checks:
   * 1. Required fields are present.
   * 2. The record has not expired.
   * 3. The confirmation strength meets the minimum requirement.
   */
  validate(record: HumanConfirmationRecord): ValidationResult {
    // Check required fields.
    if (!record.confirmation_id) {
      return { valid: false, reason: 'Missing confirmation_id.' };
    }
    if (!record.principal_id) {
      return { valid: false, reason: 'Missing principal_id.' };
    }
    if (!record.method) {
      return { valid: false, reason: 'Missing confirmation method.' };
    }
    if (!record.challenge_hash) {
      return { valid: false, reason: 'Missing challenge_hash.' };
    }
    if (!record.response_hash) {
      return { valid: false, reason: 'Missing response_hash.' };
    }
    if (!record.confirmed_at) {
      return { valid: false, reason: 'Missing confirmed_at timestamp.' };
    }
    if (!record.expires_at) {
      return { valid: false, reason: 'Missing expires_at timestamp.' };
    }

    // Check expiry.
    if (Date.now() > record.expires_at) {
      return { valid: false, reason: 'Confirmation has expired.' };
    }

    // Check strength.
    const recordLevel = HumanConfirmation.STRENGTH_ORDER[record.strength];
    const requiredLevel = HumanConfirmation.STRENGTH_ORDER[this.minimumStrength];
    if (recordLevel === undefined) {
      return { valid: false, reason: `Unknown strength level: ${record.strength}.` };
    }
    if (recordLevel < requiredLevel) {
      return {
        valid: false,
        reason: `Insufficient confirmation strength: ${record.strength} < ${this.minimumStrength}.`,
      };
    }

    return { valid: true };
  }
}
