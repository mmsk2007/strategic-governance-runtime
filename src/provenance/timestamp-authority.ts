/**
 * TimestampAuthority - Interface and mock implementation for trusted timestamping.
 *
 * Defines the contract for issuing and verifying trusted timestamps.
 * The MockTimestampAuthority provides a local-clock-based implementation
 * suitable for development and testing.
 */

import { randomUUID, createHmac } from 'node:crypto';

/** A trusted timestamp binding a hash to an authority's signature. */
export interface TrustedTimestamp {
  readonly timestamp: number;
  readonly hash: string;
  readonly authority: string;
  readonly signature: string;
  readonly serial_number: string;
}

/**
 * Abstract interface for a timestamp authority.
 *
 * Implementations should provide cryptographic proof of when
 * a specific hash existed, supporting non-repudiation guarantees.
 */
export interface TimestampAuthority {
  /** Issue a trusted timestamp for the given hash. */
  issue(hash: string): Promise<TrustedTimestamp>;

  /** Verify that a trusted timestamp is authentic and unmodified. */
  verify(timestamp: TrustedTimestamp): Promise<boolean>;
}

/**
 * Mock timestamp authority using the local clock.
 *
 * Suitable for development and testing. Signatures are HMAC-based
 * and verified locally. Not suitable for production non-repudiation.
 */
export class MockTimestampAuthority implements TimestampAuthority {
  private readonly authorityId: string;
  private readonly secret: string;
  private readonly issued = new Map<string, TrustedTimestamp>();

  constructor(options?: { authorityId?: string; secret?: string }) {
    this.authorityId = options?.authorityId ?? 'mock-timestamp-authority';
    this.secret = options?.secret ?? 'mock-tsa-secret';
  }

  /** Issue a trusted timestamp for the given hash using the local clock. */
  async issue(hash: string): Promise<TrustedTimestamp> {
    const timestamp = Date.now();
    const serialNumber = randomUUID();
    const signaturePayload = `${hash}:${timestamp}:${serialNumber}`;
    const signature = createHmac('sha256', this.secret)
      .update(signaturePayload)
      .digest('hex');

    const ts: TrustedTimestamp = {
      timestamp,
      hash,
      authority: this.authorityId,
      signature,
      serial_number: serialNumber,
    };

    this.issued.set(serialNumber, ts);
    return ts;
  }

  /** Verify a trusted timestamp by recomputing the signature. */
  async verify(timestamp: TrustedTimestamp): Promise<boolean> {
    if (timestamp.authority !== this.authorityId) {
      return false;
    }

    const signaturePayload = `${timestamp.hash}:${timestamp.timestamp}:${timestamp.serial_number}`;
    const expectedSignature = createHmac('sha256', this.secret)
      .update(signaturePayload)
      .digest('hex');

    return timestamp.signature === expectedSignature;
  }
}
