---
title: Change Advisory Board Charter
summary: Decision charter for the group that reviews exceptional, high-risk, or business-sensitive engineering changes.
status: Draft
owner: Technology Governance
updated: 2026-03-25
doc_type: Charter
---

# Change Advisory Board Charter

## Role

The Change Advisory Board exists to review changes that exceed normal team-level release authority. It is not intended to approve routine delivery. Its purpose is to create a fast but deliberate forum for changes that carry cross-team operational risk, executive visibility, or difficult rollback characteristics.

## Typical Triggers

The board should be engaged for:

- major production migrations
- coordinated releases across multiple systems of record
- changes that alter support models or ownership boundaries
- temporary policy exceptions with material risk acceptance
- emergency fixes that need retrospective governance review

## Membership

Standing membership should include representatives from engineering, platform operations, security, and product operations. Additional subject-matter owners may be added per change domain. Membership is accountable for decision quality, not merely attendance.

## Decision Standard

The board evaluates whether the proposed change is understandable, supportable, and reversible enough for the stated risk level. The board does not redesign the implementation in detail unless it uncovers a control gap that invalidates the readiness claim.

## Records

Each reviewed change must leave behind:

- the change summary
- the stated risk posture
- the approval or rejection outcome
- any compensating controls or follow-up actions
- the named accountable owner

## Review Cadence

Regular meetings should be used only for planned exceptional changes. Emergency sessions may be called when time-sensitive risk decisions are required. Retrospective review of emergency changes should occur in the next available governance window.
