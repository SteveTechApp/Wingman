# Reviewing dead CSS deletions

Run `npm run audit:dead-css:deletions` to write the proposed unified diff and
`reports/dead-css-review.json`. Each rule has an ID and lists the unused classes
that make each selector branch impossible to match.

Run `node tools/autofix-dead-css.mjs --review-deletions` to accept or decline each
rule. Only an explicit `y` accepts it. For a scripted selection, use
`node tools/autofix-dead-css.mjs --select-deletions=ID,ID`.
An empty list (`--select-deletions=`) accepts nothing.

Selection rewrites `reports/dead-css-proposal.diff` to the accepted subset,
including only the baseline allowances those removals retire. Source files do
not change until `npm run apply:dead-css:deletions`. The final patch remains
available after application. Changes to the underlying proposal invalidate the
review; regenerate it and review again. Remaining unaccepted new debt still
fails the gate.

The pre-commit hook generates and prints this proposal when its dead CSS gate
blocks. Failed visual CI verification uploads the patch and review metadata as
the `dead-css-deletion-proposal` artifact, retained for 14 days. There is no
patch to upload when no fully dead rule qualifies. Artifact handling follows
[GitHub's workflow artifact documentation](https://docs.github.com/en/actions/tutorials/store-and-share-data).

For coverage-backed pruning, first run `npm run report:css-coverage` against
the dev server, then run `node tools/propose-coverage-css-prune.mjs`.
An optional positional argument selects another coverage JSON report.
The script writes `reports/coverage-css-prune.json` and
`reports/coverage-css-prune.diff` without changing source.

Coverage only narrows candidates: every class must independently be absent
from the detector's source/tool/test corpus and documentation. Generated rules,
rules absent from the coverage findings and selectors using `:not`, `:is`,
`:where` or `:has` are retained. Review the resulting diff before applying it;
the coverage timestamp is recorded so an old sweep is visible.
