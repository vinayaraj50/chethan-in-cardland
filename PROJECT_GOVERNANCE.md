# Project Governance

This document outlines the strict engineering and security standards for the **Chethan in Cardland** project. All developers must adhere to these rules without exception.

## Security & Integrity

### Zero-Trust Client Policy
Never trust the client application to send or maintain the "balance amount" or any critical financial state. All balance calculations, adjustments, and state transitions must happen server-side via atomic transactions. The client is merely a viewport and a requester of actions.

### Concurrency Standards
To prevent "double-spend" exploits and race conditions, use database-level locks (e.g., `SELECT FOR UPDATE` or equivalent atomic operations) for all balance changes. Every transaction affecting user assets must be isolated and guaranteed to be consistent.

## Engineering Excellence

### Google Engineering Standards
Follow the **"Google Proximity"** principle: 
- Optimize for **$O(1)$** lookup whenever possible.
- Ensure **$O(\log n)$** scalability for all data structures and algorithms.
- Use strictly typed interfaces for all internal and external communication.
- Implement exhaustive error handling for every operation.

### No "Happy Path" Coding
Refuse to implement any logic that doesn't explicitly include a "Failure Case." Every feature must handle:
- Database timeouts and connection failures.
- Insufficient funds or invalid state transitions.
- Network jitter, latency, and intermittent connectivity.
- Unexpected or malicious input.

---
*Failure to comply with these standards is considered a critical bug.*

## Core Fintech Principles

1. **Adopt a Fintech Mindset**: Treat every code block as banking-grade software. Never trust client-side data for balance updates.
2. **Security-First**: Use atomic operations, prevent race conditions, and implement idempotent API designs by default.
3. **Professionalism**: Avoid 'student-level' or 'quick-fix' logic. If a feature request compromises security, refuse to implement it and explain the 'Google-level' professional alternative.
4. **Autonomy**: Propose and implement comprehensive, high-performance solutions independently. Do not ask for permission for standard best practices—just execute them.
5. **Error Handling**: Every function must include professional logging, input validation, and exhaustive error-catching.

## Data Persistence & State Management

**CRITICAL RULE: CLOUD-TRUTH AUTHORITY (MASTER)**
- **Google Drive is the absolute source of truth** for all user progress and owned lessons.
- **Browser storage is a DISPOSABLE CACHE only**. It is never an authority.
- On every login, the app MUST pull latest state from Drive BEFORE allowing local writes.
- **Merge Logic**: If local progress (e.g. 0% on new device) conflicts with remote progress (e.g. 50% on Drive), the **Remote (Cloud) MUST win**.
- **No Blind Saves**: Never overwrite cloud files without first verifying if a newer version exists remotely.
