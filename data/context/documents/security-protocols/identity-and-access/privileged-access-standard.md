---
title: Privileged Access Standard
summary: Rules for requesting, approving, granting, reviewing, and removing elevated access across production systems.
status: Approved
owner: Identity Security
updated: 2026-03-08
doc_type: Security Standard
---

# Privileged Access Standard

## Purpose

Privileged access introduces concentrated operational risk. This standard defines how elevated access is requested, justified, approved, and periodically reviewed so that teams can maintain operational agility without normalizing excessive standing privilege.

## Core Rules

- privileged access must be role-based whenever possible
- approval must come from an accountable system or data owner
- time-bounded access is preferred over permanent grants
- access changes must be logged in a system that can be audited later

## Request Requirements

Every request for elevated access must identify:

- the target system or environment
- the exact privilege needed
- the business or operational reason
- the expected duration
- the fallback plan if access is denied or delayed

## Review Cadence

Standing privileged access must be reviewed on a recurring schedule that matches system criticality. Production administrative roles should be reviewed at least quarterly. Dormant accounts and orphaned grants must be removed promptly rather than deferred to the next broad access campaign.

## Break-Glass Access

Emergency access mechanisms may exist, but they must be isolated, monitored, and reconciled after use. Break-glass credentials are not a substitute for a healthy privileged access model, and repeated emergency usage should trigger a review of whether the standard operating model is too restrictive or poorly automated.

## Removal

Access must be removed when:

- the approved time window expires
- the operator changes role
- the operator leaves the company
- the target system no longer requires the elevated function

## Evidence

The system of record must preserve who approved the access, when it was activated, and when it was removed or reviewed. If the technical platform cannot capture that evidence directly, a compensating record is required.
