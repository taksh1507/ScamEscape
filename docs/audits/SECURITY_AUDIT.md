# Frontend dependency security audit

Date: 2026-11-14. Repository: https://github.com/taksh1507/ScamEscape

Scope: npm dependency tree in `frontend`. This is a dependency remediation pass, not a complete application security assessment.

## Registry findings and remediation

The baseline npm audit reported 17 affected package entries: 1 critical, 6 high, 9 moderate and 1 low. A critical advisory affected the installed Next.js release. Next.js and eslint-config-next were aligned to **16.4.6** within the existing major version, followed by `npm audit fix --ignore-scripts` for compatible dependency updates. No force or major-version audit fix was used.

The post-change audit reports 7 affected package entries: 0 critical, 0 high, 7 moderate and 0 low. Audit counts are package-level registry matches, not a count of unique vulnerabilities or proof of exploitability in this application. The remaining moderate advisories affect development lint dependencies and minimatch; they are not waived.

## Verification and limitations

The production frontend build completed before and after the dependency changes. Existing lint failures were recorded before changes and remain unresolved; no rules or tests were disabled. GitHub CI execution, browser workflows, live APIs, authentication/authorization, secrets history and non-npm dependency trees are not established by this result. No live attack testing or deployment was performed.
