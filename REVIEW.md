# Repository Review

## Overview
The codebase is a NestJS backend with Prisma models for schools, users, announcements, and OTP-based authentication. The API scaffolding and validation are in place, but several areas need attention before production use.

## Findings
1. **OTP security and delivery** – OTPs are generated with `Math.random`, stored in plaintext, and only logged to the console instead of being rate-limited or sent through a provider. There’s no throttling or hashing, which makes brute-force and insider misuse trivial. Consider using a cryptographically secure generator, hashing stored codes, and introducing per-contact rate limits and delivery integration. 【F:src/modules/auth/auth.service.ts†L26-L53】
2. **Phone-based login lookup is brittle** – During login, the service slices the last 10 digits of the contact string to find a user. This will fail for non-10-digit numbers or when stored numbers include country codes/prefixes, breaking authentication for many locales. Matching should align with the persisted format (e.g., full E.164) rather than truncating. 【F:src/modules/auth/auth.service.ts†L137-L152】
3. **Announcements ignore tenant scoping** – Announcement routes rely on `@SchoolId()` but never apply the `SchoolScopeGuard`. As a result, `findAll` receives `schoolId` as `undefined`, causing Prisma to drop the filter and return announcements across all schools to any authenticated role. Apply the guard and validate `schoolId` to enforce multi-tenant isolation. 【F:src/modules/announcements/announcement.controller.ts†L8-L22】【F:src/modules/announcements/announcement.service.ts†L8-L14】
4. **School creation logs PII** – The school creation flow prints the full DTO (including admin contact details) to the console. This leaks PII into logs and should be removed or replaced with structured, redacted logging. 【F:src/modules/schools/schools.service.ts†L10-L54】

## Recommendations
- Secure the OTP pipeline (generation, storage, rate limiting, and delivery).
- Normalize phone storage/lookup to a consistent format instead of slicing digits.
- Enforce school scoping on all tenant-aware routes and validate presence of `schoolId` where required.
- Audit logging for sensitive data, especially around user onboarding.
