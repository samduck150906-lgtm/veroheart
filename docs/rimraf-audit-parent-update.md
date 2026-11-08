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
