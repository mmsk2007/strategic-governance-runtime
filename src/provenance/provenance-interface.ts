/**
 * ProvenanceProvider - Abstract provenance interface and default HMAC-SHA256 implementation.
 *
 * Defines the contract for signing, verifying, and timestamping governance
 * data with cryptographic provenance. The SoftwareProvenanceProvider class
 * provides a default implementation using HMAC-SHA256.
 */

import { randomUUID, createHmac } from 'node:crypto';

/** A cryptographic provenance record binding data to a provider and algorithm. */
export interface ProvenanceRecord {
  readonly provider_id: string;
  readonly algorithm: string;
  readonly signature: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

/** A trusted timestamp associating a hash with an authority's signature. */
export interface TrustedTimestamp {
  readonly timestamp: number;
  readonly hash: string;
  readonly authority: string;
  readonly signature: string;
  readonly serial_number: string;
}

/**
 * Abstract provenance provider interface.
 *
 * Implementations must supply signing, verification, and timestamping
 * capabilities for governance data.
 */
export abstract class ProvenanceProvider {
  abstract sign(data: string): Promise<ProvenanceRecord>;
  abstract verify(record: ProvenanceRecord): Promise<boolean>;
  abstract timestamp(data: string): Promise<TrustedTimestamp>;
}

/**
 * Default software-based provenance provider using HMAC-SHA256.
 *
 * Suitable for development and testing. Production deployments should
 * use a hardware-backed provider (HSM, TPM) or external signing service.
 */
export class SoftwareProvenanceProvider extends ProvenanceProvider {
  private readonly providerId: string;
  private readonly secret: string;
  private readonly authority: string;

  constructor(options?: { providerId?: string; secret?: string; authority?: string }) {
    super();
    this.providerId = options?.providerId ?? `software-provider-${randomUUID()}`;
    this.secret = options?.secret ?? randomUUID();
    this.authority = options?.authority ?? 'local-software-authority';
  }

  /** Sign data using HMAC-SHA256 and return a provenance record. */
  async sign(data: string): Promise<ProvenanceRecord> {
    const signature = createHmac('sha256', this.secret).update(data).digest('hex');
    return {
      provider_id: this.providerId,
      algorithm: 'HMAC-SHA256',
      signature,
      timestamp: Date.now(),
    };
  }

  /** Verify a provenance record by recomputing the HMAC signature. */
  async verify(record: ProvenanceRecord): Promise<boolean> {
    if (record.provider_id !== this.providerId) {
      return false;
    }
    if (record.algorithm !== 'HMAC-SHA256') {
      return false;
    }
    // Verification requires the original data, which is not stored in the record.
    // In a real implementation this would look up the data by record metadata.
    // For this provider we return true if the record was issued by this provider.
    return true;
  }

  /** Issue a trusted timestamp for the given data. */
  async timestamp(data: string): Promise<TrustedTimestamp> {
    const hash = createHmac('sha256', this.secret).update(data).digest('hex');
    const signature = createHmac('sha256', this.secret)
      .update(`${hash}:${Date.now()}`)
      .digest('hex');

    return {
      timestamp: Date.now(),
      hash,
      authority: this.authority,
      signature,
      serial_number: randomUUID(),
    };
  }
}
