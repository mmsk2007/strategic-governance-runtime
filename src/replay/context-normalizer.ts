/**
 * ContextNormalizer - normalizes context for deterministic replay.
 *
 * Ensures that context objects produce identical hashes regardless of
 * key ordering, floating-point representation, or undefined values.
 */

import { createHash } from "node:crypto";

/**
 * Describes precision loss introduced during normalization.
 */
export interface LossBoundary {
  /** Number of decimal places floats are rounded to */
  readonly float_precision: number;

  /** Fields whose string values were truncated */
  readonly truncated_fields: string[];

  /** Fields that were omitted (e.g. undefined values) */
  readonly omitted_fields: string[];
}

/**
 * A context object that has been normalized for deterministic comparison.
 */
export interface NormalizedContext {
  /** The normalized data with sorted keys and rounded floats */
  readonly data: Record<string, unknown>;

  /** SHA-256 hash of the canonical JSON representation */
  readonly hash: string;

  /** Schema version of the original context */
  readonly schema_version: string;

  /** Compression version used during normalization */
  readonly compression_version: string;

  /** Boundary describing any precision loss from normalization */
  readonly loss_boundary: LossBoundary;
}

export class ContextNormalizer {
  private readonly floatPrecision: number;
  private readonly compressionVersion: string;

  constructor(options?: { floatPrecision?: number; compressionVersion?: string }) {
    this.floatPrecision = options?.floatPrecision ?? 6;
    this.compressionVersion = options?.compressionVersion ?? "1.0.0";
  }

  /**
   * Normalizes a context object for deterministic replay.
   *
   * - Sorts all object keys recursively
   * - Rounds floating-point numbers to the configured precision
   * - Removes undefined values
   * - Produces a SHA-256 hash of the canonical JSON
   */
  normalize(
    context: Record<string, unknown>,
    schemaVersion: string,
  ): NormalizedContext {
    const truncatedFields: string[] = [];
    const omittedFields: string[] = [];

    const data = this.normalizeValue(context, "", omittedFields, truncatedFields) as Record<string, unknown>;
    const canonical = JSON.stringify(data);
    const hash = createHash("sha256").update(canonical).digest("hex");

    return {
      data,
      hash,
      schema_version: schemaVersion,
      compression_version: this.compressionVersion,
      loss_boundary: {
        float_precision: this.floatPrecision,
        truncated_fields,
        omitted_fields,
      },
    };
  }

  /**
   * Recursively normalizes a value: sorts object keys, rounds floats,
   * strips undefined values, and tracks precision loss.
   */
  private normalizeValue(
    value: unknown,
    path: string,
    omittedFields: string[],
    truncatedFields: string[],
  ): unknown {
    if (value === null) {
      return null;
    }

    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return value;
      }
      if (!Number.isInteger(value)) {
        const rounded = parseFloat(value.toFixed(this.floatPrecision));
        if (rounded !== value) {
          truncatedFields.push(path);
        }
        return rounded;
      }
      return value;
    }

    if (typeof value === "string" || typeof value === "boolean") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.normalizeValue(item, `${path}[${index}]`, omittedFields, truncatedFields),
      );
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const sortedKeys = Object.keys(obj).sort();
      const result: Record<string, unknown> = {};

      for (const key of sortedKeys) {
        const childPath = path ? `${path}.${key}` : key;
        const childValue = obj[key];

        if (childValue === undefined) {
          omittedFields.push(childPath);
          continue;
        }

        result[key] = this.normalizeValue(childValue, childPath, omittedFields, truncatedFields);
      }

      return result;
    }

    return value;
  }
}
