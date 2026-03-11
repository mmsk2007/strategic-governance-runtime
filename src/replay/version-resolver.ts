/**
 * VersionResolver - resolves exact versions for deterministic replay.
 *
 * Components register their version and configuration. During replay,
 * the resolver matches a version vector against registered components
 * to reconstruct the exact runtime environment.
 */

import type { VersionVector } from "../types/index.js";

/**
 * Resolved versions for all components referenced by a version vector.
 */
export interface ResolvedVersions {
  /** Map of component name to its registered configuration */
  readonly resolved: Map<string, unknown>;

  /** Component names that were referenced but not registered */
  readonly missing: string[];
}

interface VersionRegistration {
  readonly version: string;
  readonly config: unknown;
}

export class VersionResolver {
  private readonly registrations: Map<string, VersionRegistration[]>;

  constructor() {
    this.registrations = new Map();
  }

  /**
   * Registers a component version and its associated configuration.
   * Multiple versions of the same component may be registered.
   */
  register(componentName: string, version: string, config: unknown): void {
    const existing = this.registrations.get(componentName) ?? [];
    existing.push({ version, config });
    this.registrations.set(componentName, existing);
  }

  /**
   * Resolves a version vector to concrete component configurations.
   *
   * Each field in the version vector is mapped to a component name,
   * and the resolver looks up the matching registered version.
   * Unregistered components are reported in the `missing` array.
   */
  resolve(versionVector: VersionVector): ResolvedVersions {
    const resolved = new Map<string, unknown>();
    const missing: string[] = [];

    const vectorEntries: Array<[string, string]> = [
      ["srg_version", versionVector.srg_version],
      ["policy_version", versionVector.policy_version],
      ["model_hash", versionVector.model_hash],
      ["authority_version", versionVector.authority_version],
      ["context_schema_version", versionVector.context_schema_version],
      ["compression_version", versionVector.compression_version],
      ["tool_contract_version", versionVector.tool_contract_version],
    ];

    for (const [componentName, requiredVersion] of vectorEntries) {
      const registrations = this.registrations.get(componentName);

      if (!registrations || registrations.length === 0) {
        missing.push(componentName);
        continue;
      }

      const match = registrations.find((r) => r.version === requiredVersion);

      if (!match) {
        missing.push(componentName);
        continue;
      }

      resolved.set(componentName, match.config);
    }

    return { resolved, missing };
  }
}
