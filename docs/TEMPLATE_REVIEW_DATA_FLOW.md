# Template review: information and editing

The former page repeated a supplier schedule, a six-view room narrative, and a passive completion checklist. Editing equipment did not update the narrative/checklist input, and missing guidance appeared as a separate warning surface with no way to resolve it here.

The review now presents one task at a time:

| Step | Where information comes from | How it improves | What is carried forward |
| --- | --- | --- | --- |
| Room brief | Authored template requirement, physical room and operating design | Edit the customer's requirement, capacity, surveyed layout, construction and design narrative | Current brief in saved template, project, proposal summary and technical room facts |
| Equipment and services | Template rows and service allowances; user-added items or saved equipment | Select one functional section; edit quantities, inclusion, unit, supplier/model, product evidence and delivery notes | Current included schedule for BOM, drawings and proposal; excluded rows remain in custom templates |
| Review and confirmations | Assumptions and unresolved site checks | Amend assumptions, add/edit checks, record supporting evidence, reopen a confirmation | Unresolved checks remain warnings/assumptions; confirmation evidence becomes a design note |
| Drawings / Proposal | Current room brief and selected rows | Inspect outputs, return to the relevant editing step, then save/export | Source/display schedule notes derive from included rows, rather than the original template quantities |

A narrative edit does not change physical routing or prove product compatibility. Material changes to architecture need the full room builder. Recording evidence is a user assertion, not an independent verification by Wingman. Supplier/model and scoped engineering allowances still require confirmation before pricing.

Saving a custom template preserves an intentionally empty check list; completed checks must not reappear from fallback defaults. Browser reload discards unsaved edits, so use Save as project or Save as template to retain work.

Validation: component/data-flow tests exercise edited requirements and physical room data, changed source quantities, evidence-backed confirmation/reopening, and custom-template reload with no unresolved checks. Browser checks cover staged navigation, live brief editing, one-section schedule layout and narrow viewport fit.
