# Temporary combined validation — do not merge or deploy

This branch combines current main + owner PR117 + owner PR116 solely for isolated
validation. Integration commits/fixture entry must not be pushed back into either
owner PR. Normal production build does not import this entry; no production route
or account is created. No operational credentials, records or DB connection.

The fixture Vite build runs the real App/router/components/store and real
Supabase SDK against a loopback-only readonly HTTP adapter backed by PGlite.
The minimal SQL fixture directly includes the three source fields restored by current main.
No retired recovery SQL is applied. Both hidden fixture rows stay nonvisible; the
public fixture policy admits visible pending/reviewed/verified rows like the new main. All public projection/FK trees are checked;
SQL product queries execute as anon with product publication RLS. This is not a
hosted PostgREST/Auth test or full original-schema replay. The separate existing
guard-included bootstrap verifies the complete repository schema.

Synthetic profile injection replaces hosted authentication bootstrap. Product
loaders, search requests, mapping, live React effects, actual router navigation
and recent-view guest tracking are exercised. userId stays null, so no account or
remote history writes. API write methods are rejected and counted. Search RPC
transport is a restricted local SQL fixture, not an assertion about hosted RPC
ranking. The main comparison URL currently redirects; comparison is therefore
mounted under a test-only entry, explicitly separate from normal navigation.

The existing Linux release workflow runs combined unit/regression/type/build
checks. The extra read-only CI job builds only this fixture, installs its existing
Playwright browser runtime in CI, runs the browser suite at390px/1280px and uploads
only synthetic screenshots/results. It has contents:read, no deployment or DB
secrets. Existing audit policy is unchanged. Production normal product flow remains
unverified until an approved hosted schema reconciliation.
