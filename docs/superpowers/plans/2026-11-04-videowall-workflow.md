# Video Wall Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Guided Video Wall a question-and-answer builder from the first screen and give Expert an explicit wall-type decision at the start of its workflow.

**Architecture:** Keep the existing wall requirements and recommendation engine. Start Guided at the existing wall-type question, collect LED canvas and cabinet facts in the size question, and keep starting presets in Expert where users can still choose a wall type before refining. Keep the shared wall answer summary and review passes intact.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

**Spec:** User request in the Video Wall workflow task (2026-11-04).

## Global Constraints

- Guided is a Q&A sequence; a common wall preset must not skip its questions and open the result directly.
- Expert starts by letting the designer choose the wall application, then presents starting points and design controls.
- Preserve existing wall requirements, recommendation logic, and persisted draft fields.
- Keep wall type, answer summary, and design flow wording aligned through the shared wall workflow modules.

---

### Task 1: Make Guided a Q&A-first builder

**Files:**
- Modify: `src/wingman2/lib/videowallWizard.ts`
- Modify: `src/wingman2/pages/videowall/VideowallWizard.tsx`
- Modify: `src/wingman2/pages/videowall/VideowallWizard.test.tsx`

**Interfaces:** Keep `WallRequirements` and the existing application values; make the wall-type step the first `wallWizardSteps` entry.

- [ ] Update Guided step expectations so the first visible question is wall type.
- [ ] Move the LED canvas, pitch, and cabinet choices into the size question and disable Continue until valid.
- [ ] Remove the guided preset shortcut that jumps directly to the result.
- [ ] Update answer summaries and progress to reflect the Q&A sequence.

### Task 2: Put wall type first in Expert

**Files:**
- Modify: `src/wingman2/pages/videowall/VideowallBuilderPage.tsx`
- Modify: `src/wingman2/pages/videowall/VideowallExpertReview.tsx`
- Modify: `src/wingman2/pages/videowall/VideowallExpertReview.test.tsx`

**Interfaces:** Reuse `wallApplications` and `wallWizardApplicationPatch` to preserve valid layout constraints when the wall type changes.

- [ ] Add an explicit wall-type choice at the start of the Expert design pass.
- [ ] Keep starting presets available after the type choice and update the current type when a starting point is selected.
- [ ] Verify the selected type is represented as the active choice and affects subsequent design questions.

### Task 3: Align entry wording and narrative

**Files:**
- Modify: `src/wingman2/lib/wallEntry.ts`
- Modify: `docs/VIDEO_WALL.md`
- Modify: `AGENTS.md`

- [ ] Update shared entry wording to describe wall type → questions for Guided and wall type → starting point → design for Expert.
- [ ] Update durable instructions and the video wall narrative together.
