# The SRG Interface Contract

SRG is designed as an interface layer with stable inputs and outputs that govern the interaction between an AI agent and the control plane.

## Inputs (Per Decision)

For each decision an agent proposes, the following inputs are provided to the SRG:

-   `proposed_action`: The specific action the AI agent intends to take.
-   `model_score_raw`: The base confidence signal from the model, which can be a raw score or a value between 0.0 and 1.0.
-   `final_probability`: The calibrated probability or final confidence level associated with the decision.
-   `context`: Domain-specific context, such as the current market regime, user segment, or device constraints.
-   `constraints`: Any operational constraints, including budgets, compliance limits, or safety requirements.
-   `metadata`: Additional information for tracking and audit, such as the model version, tenant ID, channel ID, and timestamps.

## Outputs (Per Decision)

After evaluating the inputs, the SRG produces the following outputs:

-   `final_decision`: The governance decision, which can be one of `ALLOW`, `DENY`, `ALLOW_WITH_CONSTRAINTS`, `ESCALATE`, or `HALT`.
-   `constraints_applied`: If the decision is to allow with constraints, this field specifies the nature of the constraints, such as size reductions, rate limits, or fallback to safe defaults.
-   `explanation_code`: A hierarchical, machine-readable code that provides a structured explanation for the decision.
-   `decision_id`: A globally unique and immutable identifier for the decision, used for tracking and attribution.
-   `debug_trace`: An optional, structured trace of the decision-making process, intended for debugging, verification, and detailed audits.
