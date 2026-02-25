# Failure Modes and Threat Model

SRG must declare what can break it.

## Known Failure Modes

- **Insufficient sample size:** unreliable metrics and poor gating decisions.
- **Bad attribution:** mislabeled outcomes lead to wrong governance.
- **Telemetry corruption:** missing or malformed debug data undermines trust.
- **State drift mismatch:** drift metrics not correlated with true regime change.
- **Over-filtering:** governance becomes overly restrictive due to debt saturation.
- **Under-filtering:** governance fails to reduce tail events due to weak signals.
- **Latency and throughput issues:** excessive governance overhead.

## Adversarial Threats (Examples)

- Gaming reward metrics to raise `trust_score`.
- Data poisoning: injecting misleading outcomes.
- Exploiting calibration weaknesses to pass threshold checks.
- Triggering systematic blocked-winner regret to disable intervention.

Mitigation requires domain-specific threat modeling and instrumentation.
