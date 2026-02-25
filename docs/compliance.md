# SRG Regulatory Compliance Mapping

This document outlines how the Strategic Governance Runtime (SRG) framework aligns with and helps organizations meet the requirements of major AI-related regulations and standards. The adoption of the SRG is not merely a technical best practice; it is becoming a legal necessity as the global regulatory environment shifts from voluntary frameworks to strict liability regimes that demand demonstrable runtime control.

## The EU AI Act: Article 14 and Human Oversight

The European Union’s Artificial Intelligence Act stands as the most comprehensive legal framework for AI to date. Article 14 is particularly relevant to the SRG, as it mandates **“Human Oversight”** for high-risk AI systems. This is not a passive requirement for “human-in-the-loop” during training; it is an active operational requirement for the deployment phase.

Specifically, Article 14 requires that systems be designed so that natural persons can **“interrupt the system through a ‘stop’ button or a similar procedure”**. For an autonomous agent operating at machine speed (thousands of tokens per second), a physical stop button is insufficient. The “stop” function must be architectural—a “kill switch” capable of severing the agent’s connection to its tools immediately, even if the agent is in an infinite loop or experiencing high latency.

Furthermore, the Act supports a **Human-in-Command (HIC)** model, where the human retains ultimate authority. This implies that the governance layer must have higher privileges than the agent itself. The SRG satisfies this by operating as a “kernel-level” supervisor that cannot be overridden by the agent’s logic.

## Liability and the End of the “Separate Entity” Defense

The legal risks of Agentic AI were starkly illustrated in the case of *Moffatt v. Air Canada (2024)*. In this landmark ruling, a Canadian tribunal held the airline liable for incorrect information provided by its chatbot regarding bereavement fares.

Crucially, Air Canada attempted to argue that the chatbot was a “separate legal entity” responsible for its own actions—a defense the tribunal rejected as “remarkable”. The court established that a company is responsible for the output of its AI just as it is responsible for the static information on its website.

This ruling effectively kills the “glitch defense.” Organizations can no longer claim that an agent “went rogue” to escape liability. They must demonstrate that they exercised **“reasonable care”** to ensure accuracy. The SRG provides the technological infrastructure for “reasonable care” by enforcing strict policy adherence and state synchronization, proving that the organization took active measures to prevent the error.

## Emerging US Legislation: SB 53 and Colorado

In the United States, the regulatory patchwork is tightening. California’s **SB 53** (signed into law after the veto of SB 1047) mandates strict reporting timelines for safety incidents and whistleblower protections for employees who flag risky models. Although the “kill switch” mandate of SB 1047 was removed from the final bill, the liability for “catastrophic risk” remains a central theme in state-level discussions.

Colorado’s **AI Act**, taking effect in 2026, focuses on “algorithmic discrimination” and requires rigorous impact assessments. These laws collectively point to a future where “black box” autonomy is a legal liability. The SRG’s observability layer, which logs the “Chain of Thought” and decision logic, is essential for meeting these emerging compliance obligations.

## ISO/IEC 42001: The Standard for AI Management

Beyond legislation, the **ISO/IEC 42001** standard provides the international benchmark for AI Management Systems (AIMS). Clause 8 of the standard (“Operation”) explicitly requires **“operational planning and control”**. It is not enough to have a policy on paper; the organization must demonstrate controls at runtime.

Auditors certifying against ISO 42001 will look for evidence of **“continuous monitoring”** and **“anomaly detection”**. The SRG automates compliance with these clauses by acting as the enforcement point for AIMS policies. It bridges the gap between the “paperwork” (the governance strategy) and the “runtime” (the actual agent behavior).
