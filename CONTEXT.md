# Wingman Domain Context

## Design Project

A **Design Project** is the canonical sales-engineering record that carries customer evidence through topology, governed recommendation, validation, and publication. Its decision graph has five ordered stages: `evidence`, `topology`, `recommendation`, `validation`, and `publication`.

The graph is compiled from the stored Project. It has a deterministic `dpg1-*` identity: recompiling the same decision at a different time does not change its identity. Route pages render or request commands; they do not own decision policy.

## Project Workspace

The **Project Workspace** owns Project queries, commands, persistence, synchronization, and React subscription. Its public interface is `src/wingman2/features/projects/index.ts`. `src/wingman2/data/projectStore.ts` is a compatibility facade for callers that have not migrated.

Browser storage and remote synchronization are adapters behind the Project Workspace seam. Discovery, Recommendations, Project Detail, and Proposal Completion consume the public feature interface.

## Publication

**Publication** means producing a customer-facing proposal artifact from a validated Design Project. HTML/screen and DOCX representations consume the same `DesignProjectDocument`; they may format it differently but must not independently reinterpret requirements, architecture, role coverage, products, assumptions, blockers, warnings, or issue readiness.

Successful HTML, DOCX, PDF/print, and BOM CSV outputs emit privacy-safe journey evidence tied to the Project id and canonical revision hash. Customer narrative, contact details, proposal text, and product selections are not telemetry.

## Governed Compare

**Governed Compare** turns current competitor evidence and WyreStorm product evidence into a decision. Its public decision interface is `src/wingman2/features/compare/index.ts`. Historical approvals remain review evidence and never replace, insert, or suppress current engine candidates.
