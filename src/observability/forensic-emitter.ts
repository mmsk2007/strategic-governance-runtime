/**
 * ForensicEmitter - Emits forensic events with a listener pattern.
 *
 * Provides a typed publish/subscribe mechanism for governance-relevant
 * forensic events with severity classification and correlation support.
 */

import { randomUUID } from 'node:crypto';

/** Severity levels for forensic events. */
export type ForensicSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

/** A forensic event emitted by the governance runtime. */
export interface ForensicEvent {
  readonly event_id: string;
  readonly event_type: string;
  readonly timestamp: number;
  readonly severity: ForensicSeverity;
  readonly payload: Record<string, unknown>;
  readonly correlation_id?: string;
}

/** Callback type for forensic event listeners. */
export type ForensicListener = (event: ForensicEvent) => void;

/**
 * Standard forensic event types used throughout the governance runtime.
 */
export const FORENSIC_EVENT_TYPES = {
  AUTHORITY_TRANSITION: 'authority.transition',
  AUTHORITY_OVERRIDE: 'authority.override',
  EPOCH_ADVANCE: 'epoch.advance',
  DECISION_MADE: 'decision.made',
  DELEGATION_CREATED: 'delegation.created',
  DELEGATION_EXPIRED: 'delegation.expired',
  TOKEN_ISSUED: 'token.issued',
  TOKEN_EXPIRED: 'token.expired',
  POLICY_VETO: 'policy.veto',
} as const;

/**
 * ForensicEmitter - emits forensic events with a listener pattern.
 *
 * Listeners can subscribe to specific event types or to all events
 * using the wildcard '*' type.
 */
export class ForensicEmitter {
  private readonly listeners = new Map<string, Set<ForensicListener>>();
  private readonly emittedEvents: ForensicEvent[] = [];

  /** Register a listener for a specific event type. */
  on(eventType: string, callback: ForensicListener): void {
    let set = this.listeners.get(eventType);
    if (!set) {
      set = new Set();
      this.listeners.set(eventType, set);
    }
    set.add(callback);
  }

  /** Remove a listener for a specific event type. */
  off(eventType: string, callback: ForensicListener): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit a forensic event. Assigns event_id and timestamp if not provided.
   * Notifies all listeners registered for the specific event type,
   * as well as any wildcard ('*') listeners.
   */
  emit(
    event: Omit<ForensicEvent, 'event_id' | 'timestamp'> & { event_id?: string; timestamp?: number },
  ): void {
    const sealed: ForensicEvent = {
      event_id: event.event_id ?? randomUUID(),
      event_type: event.event_type,
      timestamp: event.timestamp ?? Date.now(),
      severity: event.severity,
      payload: Object.freeze({ ...event.payload }) as Record<string, unknown>,
      correlation_id: event.correlation_id,
    };

    this.emittedEvents.push(sealed);

    // Notify type-specific listeners.
    const typeListeners = this.listeners.get(sealed.event_type);
    if (typeListeners) {
      for (const cb of typeListeners) {
        cb(sealed);
      }
    }

    // Notify wildcard listeners.
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      for (const cb of wildcardListeners) {
        cb(sealed);
      }
    }
  }

  /** Retrieve all emitted events (for observability contract checks). */
  getEmittedEvents(): readonly ForensicEvent[] {
    return this.emittedEvents;
  }
}
