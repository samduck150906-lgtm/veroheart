# PR6 progress — health-concern neutral policy

- Approved base: `96424397819a6a4d4001c16400bcacc7b1bccfb6`
- Branch: `codex/pr6-health-concern-neutral-policy`
- Scope: policy-only and shadow-only evaluation of missing-evidence neutrality.
- Protected: runtime scoring/UI/ranking, allergy/poultry, stores, DB, migrations, environment, deployment.
- Raw copied production JSON must never be committed.

## Resume point

- [x] Audit existing evaluator and shadow contracts.
- [x] Checkpoint 1: policy contract and pure calculator; 12 focused tests, TypeScript, targeted ESLint, and diff check passed.
- [ ] Checkpoint 2: copied-data aggregate comparison.
- [ ] Final validation and PR creation; do not merge.
