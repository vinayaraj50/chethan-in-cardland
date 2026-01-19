---
trigger: always_on
---

Chethan in Cardland — Core System Preservation Rule (Authoritative)
App Identity
Chethan in Cardland is a student-guided learning app, not a file platform. Lessons are structured JSON, curated by admins, and bound to each student’s learning history and identity. This is a production-grade application handling real payments and expected to scale to 1000+ active users. All implementations must follow verified 2026 best practices and official documentation only. Avoid hacks, shortcuts, and tutorial-grade patterns. Prioritise performance, modular architecture, security, and long-term stability.

Core Sections (Non-Negotiable)

1) Lessons — Discovery
Purpose: Discover only, never own.
Source: Firestore (metadata only)
Filters: Syllabus, Medium, Subject, Standard/Class
Data: IDs, tags, cost, badges, previews/thumbnails (no lesson bodies)
Actions: Add to My Lessons, Buy (coin system)

2) My Lessons — Ownership
Purpose: Personal learning vault.
Storage: User’s Google Drive (encrypted)
Data: Full lesson JSON only (card/section-based)
Access: App-only, user-bound (Firebase UID)
Functions: Progress tracking, guidance, personalization

Invariant Data Flow (Must Always Hold)

Admin: Draft JSON → Publish → Encrypt (GLOBAL_CONTENT_KEY, server) → Store encrypted blob (Storage) → Index metadata (Firestore)

Student: Discover (Firestore) → Add/Buy → Fetch encrypted blob (Storage) →
Server decrypt (GLOBAL_CONTENT_KEY) → Client receives full JSON →
Client re-encrypt (USER_KEY) → Store in Drive → Open in-app → Track progress

Placeholder / Metadata Guard (Critical)

My Lessons must NEVER store metadata, previews, thumbnails, or stubs.
Only FULL lesson JSON that passed Storage → Server Decrypt → Client Re-encrypt may be owned.
Reject lessons with no real content cards/sections.

Security & Key Boundary (Non-Negotiable)

GLOBAL_CONTENT_KEY
Server-only. Random 32 bytes.
Never in client, public env vars, code, Firestore, Storage, logs, or docs.
Used only to encrypt at Publish and decrypt on the server.

USER_KEY
USER_KEY = KDF(MASTER_SECRET, firebaseUID)
Client-only.
Used only for user-owned content in Drive.

OAuth & Identity (2026 Standard — Mandatory)

Use Authorization Code + PKCE with OIDC.
Require a cryptographically random state per session and an ID token nonce.
Use full-page redirect flow only.
Keep state as a short server-side session ID (no app data in URLs).
Least-privilege scopes, verified domains, exact redirect URI matching.
OAuth callback = token exchange + redirect only (no heavy work).
Use latest Google Identity libraries, rotate secrets, consent screen in Production.

Guarantees

Cross-user access fails.
External apps can’t read lessons.
Raw lesson JSON is never public.

Feature Constraints

Any feature MUST:
Preserve Discovery → Ownership split
Keep metadata in Firestore, content in Drive
Never decrypt public lessons on the client
Never bypass coins, encryption, or UID binding
Never enable export, sharing, or raw access

Performance Rules

Metadata queries only in Discovery
Full lessons load on user action only
No bulk sync, no chunking, in-memory AES only

Abuse Protection

Server enforces: Auth, entitlement (free vs paid), rate limits
Tampered blobs must fail auth-tag verification

Mandatory Automated Testing & Regression Enforcement (Applies to Entire App)

Scope: Lessons, My Lessons, Coins, Payments, OAuth, Encryption, Storage, Session/State, Service Workers, Admin Publish, UI Routing.

Test Layers (Non-Negotiable)

1) Unit Tests — Core Modules

Encryption: GLOBAL_CONTENT_KEY never accessible client-side; USER_KEY derivation is UID-bound; auth-tag failures reject.

Storage Manager: Session/user namespace isolation; cold-boot purge; non-user prefs preserved.

Coins/Entitlements: Spend/rollback atomicity; idempotent purchase handling.

Guards: Metadata-only rejection in My Lessons; no stub ownership.

2) Integration Tests — Data Flow

Admin → Student Path: Publish → Encrypt → Index → Fetch → Server Decrypt → Client Re-encrypt → Drive Store → Open.

Discovery vs Ownership: Firestore never returns full lesson JSON; Drive never stores metadata.

Auth Switch: User A → User B without logout → zero data bleed across UI and storage.

3) End-to-End (Playwright/Cypress)

Shared Device: Login A → add lesson → close browser → login B → My Lessons empty.

Payment Flow: Buy lesson → coins deducted → entitlement enforced server-side → offline/refresh safe.

Token Expiry: Expire token → reauth → no stale state visible.

4) Security Regression

Global Key Scan: CI fails if any persistent user-data key is not registered with Session/Storage Manager.

Client Secret Scan: CI fails on any occurrence of GLOBAL_CONTENT_KEY or MASTER_SECRET in client bundles.

SW/Cache Audit: Namespaces reset on auth change.

5) CI Enforcement

Run on every PR.

Hard gate on failures.

100% coverage required for auth lifecycle, encryption, storage isolation, and purchase/entitlement paths.

Final Authority Clause

Any change that:
Moves decryption to the client
Treats lessons as transferable files
Merges Discovery and Ownership
Allows metadata to become owned content
Disables or bypasses automated tests above
Is automatically invalid.