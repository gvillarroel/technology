---
title: Implementation Controls
summary: Development-stage controls for coding, review, dependency intake, and branch protection during active delivery.
status: Approved
owner: Engineering Excellence
updated: 2026-03-02
doc_type: Control Set
---

# Implementation Controls

## Coding Expectations

Teams must build on approved languages, frameworks, and dependency sources. Experimental tools may be used only when they are isolated, documented, and approved for the intended environment. The implementation stage is not the correct place to negotiate whether a new stack should be introduced; that decision should already be governed through architecture or platform review.

## Source Control Rules

All production-bound changes must pass through version control with reviewable history. Direct edits to protected branches are prohibited. Feature branches should identify the intended change domain clearly enough that release managers and reviewers can understand the scope without opening every file.

Required controls include:

- branch protection on primary integration branches
- pull request review before merge
- automated checks for the repository's quality gates
- a durable merge record that identifies the approver

## Dependency Intake

Any new runtime dependency must be evaluated for maintenance posture, license compatibility, known vulnerabilities, and supportability. If the dependency introduces binary components, generated code, or transitive network access, the requesting team must document how those characteristics affect operational risk.

## Review Depth

Code review is not only a syntax check. Reviewers are expected to validate:

- whether the change satisfies the defined scope
- whether the implementation introduces hidden operational coupling
- whether tests or manual verification are proportionate to risk
- whether follow-on documentation updates are required

## AI-Assisted Development

AI-generated or AI-assisted code is subject to the same review and ownership requirements as manually authored code. The presence of generated code increases the need for clear verification evidence, particularly around security-sensitive logic, permission checks, and failure handling.

## Exit Rule

Implementation is complete when the branch contains the required changes, review comments are resolved or dispositioned, required checks are passing, and the release candidate can be explained by a responsible engineer without consulting uncommitted local state.
