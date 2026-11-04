# Open acceptance items

The 1.10.17 safe wiring work is delivered as a release candidate. Before treating it as a fully verified release:

1. Resolve the exact approvals in docs/NEEDS_APPROVAL.md, especially the conflicting literal removed-service ban and protected cleanup.
2. Repair every remaining inherited failure/timeout listed in tests/results/wired/suite/summary.json against explicit current behavior. Do not restore intentionally removed Settings UI.
3. Decide contracts for the four inbound-only legacy events; do not create fake listeners/producers to pass an audit.
4. Compile the native project, review MainActivity merging and test all permissions/workers/services on a target Android device.
5. Validate live keyless endpoints, optional local bridges and authorized GitHub operations outside the mocked fixture environment.
6. Only then consider versioned-patch consolidation with a passing behavior baseline and seven-surface/two-viewport screenshot comparisons. No consolidation is claimed in this package.
