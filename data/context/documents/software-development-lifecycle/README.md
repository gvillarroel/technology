---
title: Software Development Lifecycle Manual
summary: Governing document for planning, building, validating, releasing, and maintaining software products across internal engineering teams.
status: Approved
owner: Engineering Excellence
updated: 2026-03-14
doc_type: Operating Manual
---

# Software Development Lifecycle Manual

## Purpose

This manual defines the baseline lifecycle expected for product and platform teams that build or maintain software on behalf of the company. It is written as an internal reference rather than a training deck, so each section favors explicit controls, artifacts, and decision points over narrative explanation.

The lifecycle is intentionally opinionated. Teams may add stricter controls for regulated products, but they should not remove the controls described here without documented approval from Engineering Excellence and Security Architecture. The intended outcome is a predictable delivery model that improves auditability, reliability, and operational readiness.

## Scope

The manual applies to:

- customer-facing applications
- internal tools with privileged or sensitive data access
- automation services, APIs, and event-driven workers
- AI-assisted or AI-native systems that influence product or operational decisions

The manual does not replace local team playbooks. Instead, it establishes the minimum structure that local playbooks must inherit. Where a team-specific process is more detailed, the stricter or more explicit rule prevails.

## Lifecycle Posture

Every work item should move through five recurring stages:

- plan the change and define success criteria
- build the change with approved engineering controls
- validate the change with automated and human review
- release the change through a managed deployment path
- operate the change with measurable ownership and support expectations

Progression between stages should be visible in a delivery system of record. That record may be a combination of issue tracking, pull request history, deployment metadata, and change-control evidence, but the resulting chain must be reconstructable without tribal knowledge.

## Required Artifacts

The following artifacts must exist before a delivery workflow can be considered complete:

- an approved scope statement or equivalent ticket set
- implementation traceability to source control
- verification evidence, including automated checks and reviewer sign-off
- release metadata that identifies the environment, version, and operator
- post-release ownership, monitoring, and rollback instructions

## Control Principles

### Definition Before Build

Engineering work should not begin without a defined objective, a named owner, and a practical understanding of dependency and risk. Ambiguous work items tend to defer operational decisions until late in delivery, which increases rework and weakens release confidence.

### Evidence Over Assertion

Approvals, readiness claims, and test completion must be backed by durable evidence. A verbal confirmation or transient chat approval is not a substitute for a recorded review, linked artifact, or logged system status.

### Reversible Delivery

The delivery path should prefer incremental and reversible change. When reversal is impractical, the implementation plan must document compensating controls, including staged rollout, precomputed fallback behavior, or an explicit outage window.

## Related Subdocuments

- Requirements and planning guidance are defined in the `phases` folder.
- Release readiness controls are defined in the `release-management` folder.
- Governance and exception handling are defined in the `governance` folder.

## Operating Expectation

Teams are expected to treat this manual as a living operational reference. The content is stored in Markdown so that updates can be proposed through the same review process as application code, and so that nested subdocuments can evolve without breaking the top-level policy frame.
