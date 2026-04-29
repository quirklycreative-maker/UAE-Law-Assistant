# Project Rules & Locked Features

## 1. Core Navigation
The following navigation items MUST always be present and accessible:
- **Home**: Main landing page.
- **Chat (Assistant)**: The core AI legal research tool.
- **Legislation**: The case law and document library.
- **History**: User interaction history.
- **Find Lawyer**: Client-side lawyer directory.
- **My Bookings**: Appointment management.

## 2. Role Management
- The **"Become Lawyer/Client" toggle** (Super Admin only) is a development/testing tool and should be accessible via the profile/header menu.
- **Management (Admin)**: Only visible to the super admin email (`universe.24.369@gmail.com`).

## 3. Customer Support
- The Support Chat is an AI-powered customer service tool.
- It is reachable via a **Floating Action Button** (LifeBuoy icon) for all authenticated users.
- Support sessions are role-aware (Lawyer vs. Client) and are synced to the `support_sessions` Firestore collection for admin monitoring.

## 4. UI/UX Style
- Use the **"Huqiqiyy"** aesthetic: minimal, high-contrast, professional (UAE theme).
- Maintain RTL/LTR support consistency.
- Navigation should stay focused; secondary tools should be in the profile or floating menus.
