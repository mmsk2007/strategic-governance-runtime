# Modes and Posture Control

SRG controls the level of autonomy granted to an AI agent through a system of explicit operational modes. These modes allow the system to dynamically adjust its posture based on performance, risk, and environmental conditions. The core principle is that modes regulate autonomy, not the underlying intelligence of the agent.

| Mode          | Description                                           |
|---------------|-------------------------------------------------------|
| `SHADOW`      | Observe and log only; no active intervention.         |
| `BOOTSTRAP`   | Minimal enforcement with high caution; for new agents.|
| `NORMAL`      | Standard governance with moderate constraints.        |
| `AGGRESSIVE`  | Selective growth posture; still governed.             |
| `DEFENSIVE`   | Tail-risk suppression posture; high caution.          |
| `QUARANTINE`  | Restrict actions to only the safest operations.       |
| `HALT`        | Stop all autonomous actions entirely.                 |

> **Modes regulate autonomy, not intelligence.**
