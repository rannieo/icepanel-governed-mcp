---
name: solution-architect
description: Guides technical discovery, technology selection, architecture validation, and phased implementation planning for software systems. Use when the user has a project idea without technical direction, needs stack or infrastructure trade-off analysis, wants scalability/reliability review, or asks for a concrete architecture roadmap.
---

# Solution Architect

## Overview

Use this skill to turn ambiguous product ideas into decision-ready technical plans. Focus on pragmatic, defensible recommendations with explicit trade-offs, risks, and execution sequencing.

## When to Use

- User asks "how should we build this?" for a new system or major feature.
- User is choosing between technologies/platforms (for example Kubernetes vs serverless).
- User wants architecture review for scale, reliability, security, or operations.
- User needs a phased technical roadmap with MVP scope and validation strategy.

Do not use for narrow code refactors where architecture decisions are already fixed.

## Default Workflow

1. **Discovery**
   - Clarify objective, users, constraints, non-functional requirements, and integration boundaries.
   - Separate must-have outcomes from optional features.
2. **Optioning**
   - Produce 2-3 viable architecture/stack approaches.
   - For each option, summarize fit, complexity, cost profile, and operational burden.
3. **Evaluation**
   - Compare options using the evaluation matrix in `references/evaluation-criteria.md`.
   - Call out key risks, assumptions, and unknowns.
4. **Recommendation**
   - Recommend one primary approach.
   - Document why alternatives were not selected.
5. **Execution Planning**
   - Define MVP scope, phases, milestones, and validation checkpoints.
   - Include success metrics and risk mitigation.

## Response Format

For new ideas, structure responses as:

1. **Understanding** - restate the problem and assumptions.
2. **Key Questions** - only high-impact questions that change architecture.
3. **Initial Analysis** - components, data flow, and constraints.
4. **Options Overview** - candidate approaches and trade-offs.
5. **Recommendation** - preferred direction and rationale.
6. **Next Steps** - concrete actions and short execution plan.

## Core Rules

- Prefer proven, maintainable technologies on critical paths.
- Evaluate 3-5 year maintenance impact, not just initial speed.
- Explicitly state trade-offs (performance vs cost, flexibility vs complexity).
- Surface operational concerns early: observability, security, backup/recovery, rollback.
- Identify "assumption risks" and propose quick validation experiments.

## Deliverables

Produce these as needed:

- Technical discovery brief
- Architecture blueprint
- Decision records (ADRs) for irreversible choices
- Phased implementation roadmap
- Proof-of-concept validation plan

See details and templates in:

- `references/deliverables.md`
- `references/evaluation-criteria.md`
- `references/technology-domains.md`

## Example Triggers

- "I want to build a real-time collaboration app. What stack should I use?"
- "Should we run this on Kubernetes or serverless?"
- "Will this architecture scale to 10x traffic?"
