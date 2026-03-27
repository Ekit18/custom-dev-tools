<!-- SYNC IMPACT REPORT
============================
Version change: [UNVERSIONED/TEMPLATE] → 1.0.0
Bump rationale: Initial fill — all placeholder tokens replaced with concrete principles and governance.

Modified principles:
  (none — initial population, no prior named principles)

Added sections:
  - Core Principles: I. Code Quality
  - Core Principles: II. Testing Standards
  - Core Principles: III. User Experience Consistency
  - Core Principles: IV. Performance Requirements
  - Quality Gates
  - Development Workflow
  - Governance

Removed sections:
  (none)

Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section is correctly generic;
     gates are resolved at plan-creation time by speckit.plan. No update required.
  ✅ .specify/templates/spec-template.md — Success Criteria supports measurable performance
     outcomes; User Scenarios & Testing enforces independently testable stories. Aligned.
  ✅ .specify/templates/tasks-template.md — Test-first note, polish phase with performance
     optimisation, and parallel task markers all align with the four principles. No update required.

Deferred items:
  (none — all tokens resolved)
============================
-->

# Custom Dev Tools Constitution

## Core Principles

### I. Code Quality

Every piece of code MUST be clean, maintainable, and reviewed before it is merged.

- Functions MUST have a single responsibility and MUST NOT exceed 50 lines; extract
  shared logic into reusable modules rather than duplicating it.
- All code MUST be fully typed; TypeScript strict mode is enforced project-wide with
  zero type errors allowed.
- Linting and formatting MUST pass with zero warnings or errors before any pull request
  is merged; the formatter configuration is authoritative.
- Technical debt MUST be tracked; inline TODOs that reference no open issue are
  prohibited from being merged.
- Code reviews MUST include at least one peer approval and MUST verify adherence to
  this constitution before merge is permitted.

**Rationale**: Maintainability degrades silently. Consistent quality gates applied at
every merge prevent incremental rot and reduce the long-term cost of change.

### II. Testing Standards

No feature is complete without tests; tests MUST be authored before or alongside
implementation (test-first where feasible).

- Unit test coverage MUST meet or exceed 80% on all changed files; regressions below
  this threshold are a merge-blocking failure.
- Every user-facing feature MUST have at least one integration or end-to-end test
  covering the primary acceptance scenario.
- Tests MUST be deterministic, isolated, and fast; unit tests MUST each complete in
  under 100 ms and MUST NOT depend on external services without mocking.
- Flaky tests MUST be quarantined immediately on detection and resolved within the
  current sprint; they MUST NOT be left in the main suite.
- Test names MUST follow a descriptive "Given / When / Then" or plain-sentence pattern
  so failures are self-documenting without inspecting the body.

**Rationale**: Tests are the primary safety net and living documentation of intended
behaviour. Coverage thresholds and quality rules prevent silent regressions and ensure
tests remain trustworthy signals.

### III. User Experience Consistency

All UI changes MUST conform to the established design system and shared interaction
patterns; novelty for its own sake is prohibited.

- Existing reusable components MUST be used or extended before new ones are created;
  design tokens (colours, spacing, typography) MUST NOT be hardcoded inline.
- New UI MUST meet WCAG 2.1 Level AA accessibility requirements as a minimum; automated
  accessibility checks (e.g., axe) MUST pass in CI.
- Every user-facing feature MUST include designed and implemented states for: loading,
  error, empty, and success conditions — none of these may be deferred to a follow-up.
- User flows MUST be validated against the acceptance scenarios in the feature spec
  before a story is marked complete.
- Breaking changes to established interaction patterns MUST be documented in the spec
  and communicated to stakeholders before implementation begins.

**Rationale**: Inconsistent UX erodes user trust and inflates support burden. A shared
component system enforces visual and behavioural predictability across all features.

### IV. Performance Requirements

Features MUST NOT degrade established performance baselines; any regression is a
merge-blocking failure until resolved or explicitly approved.

- Core Web Vitals MUST remain within Google's "Good" thresholds at all times:
  LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- API and server-action response times MUST be ≤ 200 ms at the 95th percentile under
  normal production load.
- JavaScript bundle size (gzip) MUST NOT increase by more than 5 kB per pull request
  without explicit written approval in the PR description.
- Database queries introduced by a feature MUST be reviewed for index usage; N+1 query
  patterns are prohibited.
- Performance MUST be measured in CI (e.g., Lighthouse CI); a regression of more than
  5 Lighthouse points from the tracked baseline is a merge-blocking failure.

**Rationale**: Performance is a product feature. Degradation is introduced
incrementally; automated gates catch regressions before they reach production.

## Quality Gates

Quality gates are the enforceable checkpoints for the Core Principles. ALL gates MUST
pass before a pull request may be merged:

| Gate | Requirement |
|------|-------------|
| **Lint & Format** | Zero warnings or errors; formatter config is authoritative |
| **Type Safety** | TypeScript strict compile succeeds with zero errors |
| **Test Coverage** | ≥ 80% line coverage on changed files; full suite green |
| **Accessibility** | Automated axe (or equivalent) check passes on new UI |
| **Performance** | Lighthouse CI score does not regress > 5 points from baseline |
| **Bundle Size** | JS bundle increase ≤ 5 kB gzip, or PR carries explicit approval |
| **Code Review** | Minimum one peer approval confirming constitution compliance |

## Development Workflow

- Features MUST be developed on dedicated branches following the naming convention
  established in the implementation plan (`###-feature-name`).
- A feature specification MUST be written and approved before implementation begins;
  implementation that precedes an approved spec is out of compliance.
- Each user story MUST be independently implementable, testable, and releasable as a
  Minimum Viable Product increment; cross-story coupling that breaks this independence
  MUST be justified in the plan.
- Complexity violations relative to this constitution MUST be recorded in the plan's
  Complexity Tracking table with explicit justification and a simpler rejected
  alternative.
- All contributors MUST re-verify constitution compliance at Phase 0 (research gate)
  and again after Phase 1 (design gate) as part of the Constitution Check in every
  implementation plan.

## Governance

This constitution supersedes all other documented development practices and preferences.
Amendments require:

1. A written proposal describing the change and its motivation.
2. Review and approval by at least one other contributor.
3. A migration plan for existing code materially affected by the amendment.
4. A version increment applied according to the policy below.

**Versioning Policy**:
- **MAJOR**: Backward-incompatible principle removal, redefinition, or governance
  restructure that invalidates prior decisions made under this constitution.
- **MINOR**: New principle or section added, or materially expanded guidance that
  affects implementation decisions going forward.
- **PATCH**: Clarifications, wording refinements, formatting, or typo fixes with no
  semantic change.

**Compliance Review**: Principles MUST be verified at every PR merge via the
Constitution Check in the feature's implementation plan. A holistic review of this
constitution MUST be conducted each quarter; outcomes are recorded as an amendment if
changes are warranted.

**Version**: 1.0.0 | **Ratified**: 2026-03-27 | **Last Amended**: 2026-03-27
