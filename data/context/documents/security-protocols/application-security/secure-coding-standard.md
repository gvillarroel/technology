---
title: Secure Coding Standard
summary: Baseline implementation expectations for input handling, secrets, dependencies, logging, and security-sensitive review.
status: Approved
owner: Application Security
updated: 2026-03-17
doc_type: Security Standard
---

# Secure Coding Standard

## Scope

This standard applies to any code that processes company data, customer data, authentication state, or infrastructure control paths. It is written to be language-agnostic while still concrete enough to guide implementation and review.

## Baseline Expectations

Engineering teams must:

- validate untrusted input at system boundaries
- use approved secret storage mechanisms instead of hard-coded values
- keep dependency intake bounded and reviewable
- avoid logging credentials, personal data, or raw tokens
- use least-privilege service identities for machine-to-machine access

## Error Handling

Errors should be useful to operators without leaking internal implementation detail to end users or external callers. Public-facing error messages should avoid stack traces, secret material, and sensitive environmental context. Internally, logs should preserve enough metadata to support investigation and recovery.

## Sensitive Changes

Changes involving authentication, authorization, session state, encryption, or high-impact data transformations require deeper review. Teams should assume that these areas deserve focused reviewer attention, explicit tests, and a clearer threat discussion in the pull request or design note.

## Dependency Controls

Dependencies should be introduced deliberately. Teams must understand where a dependency executes, how it is updated, what permissions it requires, and what supply-chain trust assumptions it introduces. A small dependency that grants transitive build or network execution can carry more risk than a larger but well-governed platform library.

## Verification

At minimum, secure coding verification should combine:

- static review of the implementation approach
- automated checks appropriate to the repository
- manual reasoning about high-risk control flow and failure modes

## Exception Handling

When a team cannot comply fully, the exception must state the unmet requirement, the reason, the compensating control, the risk acceptance owner, and the expiration or revisit date.
