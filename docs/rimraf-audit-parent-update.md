# Compatible rimraf parent update (2026-11-08)

This is a partial dependency remediation, separate from the mobile UI PR.
Current main locks Capacitor CLI8.5.3 -> rimraf6.1.3 -> glob13.0.6 ->
minimatch10.2.4. The CLI already permits rimraf^6.0.1.

The new official [rimraf6.1.4](https://github.com/isaacs/rimraf/releases/tag/v6.1.4)
permits glob^14.0.3. A normal `npm update rimraf --package-lock-only
--ignore-scripts --no-audit --no-fund` with repository npm11.13.0 resolves
glob14.0.4 -> minimatch11.0.5, both outside the published affected ranges:

- [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4):
  >=9.0.0 <=14.0.1 affected,14.0.2 patched.
- [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249):
  >=7.0.0 <11.0.1 affected,11.0.1 patched. The Nov4 clarification excludes
  the old minimatch3 line; this is advisory metadata, not a local suppression.

No override, direct dependency range, Node version, audit threshold or runtime
source changes. Only this parent subtree changes: rimraf/glob/minimatch,
path-scurry and its lru-cache, plus the upstream matcher helper. npm also
recalculates TypeScript's devOptional metadata; its version and integrity are
unchanged. This does not declare TypeScript or all tooling fixed.

The typescript-estree8.57.2 -> minimatch10.2.4 path remains affected. Latest
checked same-major typescript-eslint/typescript-estree8.72.1 still requires
minimatch^10.2.2, so updating it does not fix the advisory. No repeat override
experiment or broad toolchain migration is included. Resume that path when a
supported parent selects patched11+ or an officially patched compatible line.

The focused tests exercise the CommonJS `rimraf.sync` API actually imported by
Capacitor iOS build/migrate, and ESM async glob selection using disposable
synthetic files. Existing full web/native CI remains unchanged apart from that
test step. These are compatibility tests, not an exploit reproduction or proof
of absence of all vulnerabilities. Existing audit remains enforced and may fail
for the unresolved development tooling path. No PR-specific exception is used.

No operating data, database access, deployment or migration is involved. Linux
CI performs installation/build validation; blocked Mac native bindings are not
executed, reinstalled or bypassed.

## Final release preparation

The independent workflow uses the original landing web steps verbatim on
ubuntu-latest, Node from .nvmrc (24), npm11.13.0: landing npm ci, then
lint/typecheck/build, then audit at moderate. It does not change or bypass the
original web job's order or audit failure. Independent landing success must not
be reported as success of the full web job.

A separate installation receipt compares declarations, lockfile versions,
package dependencies and npm ci's installed integrity metadata. Its artifact
contains only public package metadata, not environment variables or operating
data. The explicitly named temporary integration branch additionally builds
main + this dependency patch + the separate mobile layout PR and runs only
the focused detail/layout tests justified by that combination. No integration
commit is copied back into either feature PR; no verification PR is required.

The 2026-11-09 recheck found no newer solution in the official latest metadata:
typescript-eslint and typescript-estree remain8.72.1, with minimatch^10.2.2.
The residual seven moderate tooling entries remain a release condition. Resume
only for a supported patched dependency range/backport; no further candidate
installation or failed override experiment is justified by unchanged metadata.

## 2026-11-10 closure against main124

The earlier residual7 root /8 landing entries are historical, not the current CI
result. Main124 (`ff11534`, merged before label-evidence work) added a scoped
`@typescript-eslint/typescript-estree -> minimatch ^11.0.5` override to both
manifests; lockfiles replace nested10.2.4 with11.0.5 plus its normal helper. This
is a **major override outside the parent's declared ^10.2.2**, not a supported
parent-range upgrade. It is unrelated to label-evidence functionality and is not
introduced or changed by PR123/122. Parent-range support remains maintenance debt.

The existing124 npm-ci installation receipt confirms root estree8.57.2 nested
minimatch11.0.5 and matching lock integrity. Landing lock has estree8.70.0 nested
minimatch11.0.5; fresh Linux npm ci, lint/type/build/audit ran on final feature CI.
Local reused node_modules still has10.2.4 and is **not** proof of the new installed
CI tree. Root7 were the same minimatch advisory plus six affected parents; landing8
adds eslint-config-next as another dependent. They are not15 independent advisories.

The official minimatch advisory above affects >=7 <11.0.1, patched11.0.1, so11.0.5
is outside that range. Existing121 already selected rimraf6.1.4/glob14.0.4, outside
the glob advisory range. Root and landing final Linux CI each execute
`npm audit --audit-level=moderate` and exit0 (0 vulnerabilities). No ignore/force,
threshold, protection or workflow audit-order change explains this result. The
full landing steps now execute; their result is no longer only an independent job.

Close repeated investigation of these historical failures. Resume only if lock
resolution/manifest changes, a new advisory affects the installed versions, audit
becomes nonzero, or an upstream supported parent range permits retiring the
existing override. Current tests establish lint/build compatibility, not a proof
of all glob semantics or zero future vulnerabilities.
