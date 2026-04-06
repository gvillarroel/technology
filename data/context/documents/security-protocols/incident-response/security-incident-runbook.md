---
title: Security Incident Response Runbook
summary: Escalation and coordination runbook for triaging and managing confirmed or suspected security incidents.
status: In Review
owner: Security Operations
updated: 2026-03-24
doc_type: Runbook
---

# Security Incident Response Runbook

## Activation

This runbook should be activated when a security event is confirmed or reasonably suspected to involve unauthorized access, material data exposure, malicious code execution, credential compromise, or policy-violating system behavior. The first goal is not to explain everything immediately; it is to establish control, scope, and communication discipline.

## First Thirty Minutes

The incident lead should coordinate the following actions:

- declare an incident channel and named lead
- capture the triggering evidence and timeline start
- identify systems, users, or credentials that may be affected
- decide whether containment actions should begin immediately
- assign a scribe for durable event logging

## Containment Principles

Containment should reduce harm without destroying evidence unnecessarily. In some cases, immediate credential rotation or service isolation is correct. In other cases, premature action may erase volatile context that is needed to understand the source and blast radius. When the correct move is unclear, the incident lead should document the tradeoff explicitly and request senior support.

## Communications

Incident communication must remain factual and time-stamped. Avoid speculation presented as conclusion. Every major update should state what is known, what is unknown, what action has occurred, and what action is next. External communication requires approval through the designated security and communications path.

## Recovery

Recovery begins only after containment has stabilized and the team understands enough of the root cause to avoid immediate re-entry into the same unsafe state. Recovery actions should be staged and verified instead of pushed broadly under pressure.

## Closure

Closure requires:

- a final timeline
- impact statement
- root-cause summary
- corrective action list with owners
- lessons learned suitable for future protocol updates
