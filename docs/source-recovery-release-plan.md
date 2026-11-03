# Retired source recovery proposal — DO NOT DEPLOY

This proposal is superseded by main875ea600/98301b3 and operator-provided hosted
metadata. The columns already exist. The remote ledger contains20261103140000,
after candidate20261103120000. Do not execute or bump the retired candidate,
mark original migrations applied, or use include-all. No obsolete recovery bundle
or dry-run was generated. Its former offline builder/preflight scripts and SQL
drafts were removed from the current PR tree to prevent accidental use.

Historical candidate SHA256:
9b615b361e653145f12d83221a47edb775c0797b847de49fed18b03997a38f4b.
Private evidence and previous Git commits retain provenance. The current local-only
SQL fixture is not a migration and must never be deployed. Further work concerns
real public reads, policy/privacy verification and error handling, not adding
these columns again. Full version/name matching does not establish statement
identity or authorize applying the remaining seven pending migrations.
