# Security Specification: Gold Spin Firestore Protection

This specification outlines the attribute-based access controls and zero-trust assertions enforced upon the Firestore collections of `goldspin-jo`.

## 1. Data Invariants
- **Admins** have full Read & Write privileges over all collections (`prizes`, `accessRequests`, `stats`, and `wins`).
- Only verified Google-authenticated users (`request.auth.token.email_verified == true`) may perform general database activities.
- Handled users can read their own `accessRequests` and create pending access requests, but they cannot approve or reject their own requests.
- All users can read active `prizes` to render the wheel.
- Active users can read and write `wins` (their own records) and increment `stats`.
- Field immutability matches the structural schema requirements.

---

## 2. The "Dirty Dozen" Threat Payloads (Exploit Verification Vectors)

1. **Unauthenticated Read on Stats:** Attacker attempts to list `stats` or `prizes` while completely anonymous. -> *EXPECTED: PERMISSION_DENIED*
2. **Identity Spoofing - Impersonating Admin in Requests:** Non-admin attempts to write an `accessRequests` document with `"status": "مقبول"`. -> *EXPECTED: PERMISSION_DENIED*
3. **Ghost Field Injection (Shadow Update):** User updates their own access request with an extra field `"vipPrivileges": true`. -> *EXPECTED: PERMISSION_DENIED*
4. **Incorrect ID Spoofing/Poisoning:** Attempt to inject an access request using a 10KB junk string as the document ID. -> *EXPECTED: PERMISSION_DENIED*
5. **Unauthorized Prize Modification:** Regular member attempts to update or delete a prize label. -> *EXPECTED: PERMISSION_DENIED*
6. **Self-Approve Member Status:** Regular member attempts to modify the `status` field of their `accessRequests` to `"مقبول"`. -> *EXPECTED: PERMISSION_DENIED*
7. **Bypass Temporal Integrity:** Attempt to create any transaction (e.g., `wins`) with a hardcoded client-side future `createdAt` value instead of the server timestamp (`request.time`). -> *EXPECTED: PERMISSION_DENIED*
8. **Malicious Value Type Poisoning:** Attempt to update global stats `totalDistributed` with a string value `"one million"`. -> *EXPECTED: PERMISSION_DENIED*
9. **PiI Blanket Query Leak:** Authenticated user attempts to query and fetch all user email addresses from `accessRequests` without restrictive constraints. -> *EXPECTED: PERMISSION_DENIED*
10. **Admin Identity Impersonation:** Trying to spoof email header with `email_verified: false` to claim admin credentials. -> *EXPECTED: PERMISSION_DENIED*
11. **Win Logging for Different User:** Attempt to log a win under a foreign user's email ID. -> *EXPECTED: PERMISSION_DENIED*
12. **Post-Terminal State Locking Bypass:** Trying to alter an access request which already possesses the terminal state `'مرفوض'` or `'مقبول'`. -> *EXPECTED: PERMISSION_DENIED*

---

## 3. Test Configuration (DRAFT Rules Verification)
A complete suite verifying permission denials across each of these edge cases is secured when deploying `firestore.rules`.
