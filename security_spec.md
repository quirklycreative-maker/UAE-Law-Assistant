# Firestore Security Specification - Huqiqiyy UAE

## 1. Data Invariants
- **Identity Integrity**: Users can only create profiles/applications with their own UID.
- **Role Invariant**: Only verified admins can grant or revoke lawyer authorizations.
- **Relational Sync**: Consultations cannot exist without referencing a valid lawyer and being owned by a valid client.
- **Immutability**: `createdAt` and `userId` fields must never change after creation.
- **Terminal State**: Once a consultation is 'completed' or 'cancelled', no further updates are allowed except by admins.
- **PII Isolation**: User private data is restricted to the owner.

## 2. The "Dirty Dozen" (Attack Payloads)
1. **Self-Promotion**: Client attempting to write to `authorized_lawyers` or `admins`.
2. **Shadow Field Injection**: Adding `isVerified: true` to a user profile update.
3. **Identity Spoofing**: Creating a `support_session` for another user's UID.
4. **State Jumping**: Transitioning a `consultation` from `pending` directly to `completed` without payment or confirmation.
5. **Fee Manipulation**: Updating own consultation document to change `price` or `paymentStatus`.
6. **Denial of Wallet**: Injected 1MB junk string into `licenseNumber` or `displayName`.
7. **Orphaned Record**: Creating a `consultation` for a non-existent lawyer ID.
8. **PII Scraping**: Attempting to list all `users` or `lawyer_applications` as a guest or basic user.
9. **History Tampering**: Modifying `createdAt` on an `ai_conversation` to appear older/newer.
10. **System Bypass**: Editing AI-generated `messages` in a `lawyer_co_pilot` session after the AI has responded.
11. **Admin Escalation**: Attempting to add self to `admins` collection.
12. **Lawyer Override**: A lawyer attempting to change their specialization to one they aren't qualified for without re-verification.

## 3. Test Runner Design
The `firestore.rules.test.ts` (conceptual) will verify that each of these "Dirty Dozen" payloads results in `PERMISSION_DENIED`.

### Sample Test Cases:
- `auth_user_sets_own_admin`: Fails (Admin collection is restricted).
- `client_updates_payment_status`: Fails (Consultation fields like price/paymentStatus are immutable or restricted).
- `user_reads_others_support_session`: Fails (Relational read check fails).
