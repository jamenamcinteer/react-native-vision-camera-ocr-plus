# Security Policy

Thank you for helping keep this project and its users safe. This document explains how to report vulnerabilities, what versions are supported, and how we handle security fixes.

## Supported Versions

We follow [SemVer](https://semver.org/) and support the latest releases as shown below. Security fixes are backported according to severity and feasibility.

| Version | Status            | Security Fixes |
|--------:|-------------------|----------------|
| `^MAJOR.MINOR` (latest) | **Active**         | ✅ Yes |
| Previous minor (N-1) | **Maintenance**    | ✅ Critical & High only |
| Older versions | **End of Life** | ❌ No |

## Reporting a Vulnerability

**Please DO NOT open a public GitHub issue for security reports.**

Use the following private channel:
- **GitHub Security Advisory:** Navigate to **Security → Report a vulnerability** in this repo.

When reporting, include:
- A clear description of the issue and its impact
- Steps to reproduce (PoC, logs, screenshots, minimal repo)
- Affected versions and environment details
- Any known mitigations or workarounds

We’ll acknowledge receipt within the **Service Levels** below and keep you updated throughout triage and remediation.

> If you believe the issue affects the broader ecosystem (e.g., upstream libraries or a supply-chain compromise), please indicate that so we can coordinate responsibly.

## Service Levels (SLA)

We aim to meet or exceed the timelines below. If coordinated disclosure requires an embargo (e.g., with upstreams), we’ll communicate expected dates.

| Severity (CVSS v3.1) | Acknowledge | Triage Completed | Fix/Advisory Target |
|----------------------|-------------|------------------|---------------------|
| **Critical (9.0–10.0)** | 24 hours    | 48 hours          | 7 days              |
| **High (7.0–8.9)**     | 48 hours    | 5 days            | 14 days             |
| **Medium (4.0–6.9)**   | 5 days      | 10 days           | Best effort         |
| **Low (0.1–3.9)**      | 7 days      | Best effort       | Best effort         |

> These targets are goals, not guarantees. Complex issues (or those requiring upstream fixes) may require more time.

## Security Hardening & Supply-Chain Practices

To reduce risk for users of this package, maintainers strive to:
- Require **2FA** for maintainers on GitHub and npm.
- Use **protected branches**, required reviews, and signed commits where possible.
- Publish with **npm provenance** / **Sigstore** (when available) and include build-time integrity checks.
- Run automated checks (e.g., **CodeQL**, **dependency audit**) and review changes to build and release pipelines.
- Avoid secrets in the repo; CI uses org-level secrets with least privilege.
- Restrict publish access to trusted maintainers; releases are automated via CI to reduce human error.

If you observe suspicious activity (e.g., typosquatting, hijacked npm package, malicious dependency), please include that context in your report so we can coordinate with registries.

## Scope & Non-Security Issues

Please use **GitHub Issues** for non-security bugs, feature requests, or usage questions. Performance bugs or crashes without a security impact should not be reported via private channels.

