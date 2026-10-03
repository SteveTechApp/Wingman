$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

git add -- docs/trusted-testing/README.md
git add -- docs/trusted-testing/tester-scenarios.md
git add -- docs/trusted-testing/feedback-form.md
git add -- docs/trusted-testing/known-limitations.md
git add -- docs/trusted-testing/release-checklist.md
git add -- docs/trusted-testing/internal-tester-invite.md

git add -- docs/dev-passes/product-pitch-safety-story.md
git add -- docs/dev-passes/discovery-handoff-evidence.md
git add -- docs/dev-passes/trusted-tester-scenario-validation.md

git add -- tools/check-trusted-tester-pack.mjs
git add -- tools/run-trusted-tester-readiness.ps1
git add -- tools/stage-trusted-tester-pack.ps1

git diff --cached --name-status