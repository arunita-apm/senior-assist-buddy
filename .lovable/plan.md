

## Problem Analysis

There are two related issues:

1. **User ID mismatch**: When an existing user (created before Firebase auth) signs in, the code finds them by phone number and uses their original DB `id`, which differs from the Firebase UID. New users get the Firebase UID as their DB `id`. This inconsistency causes problems.

2. **RLS is broken**: All RLS policies use `auth.uid()`, but since there's no Supabase auth session (only Firebase auth), `auth.uid()` returns `null`. This means all INSERT/UPDATE/DELETE operations on medications, reminders, appointments, and reminder_logs silently fail due to RLS violations.

## Solution

Create a Firebase-to-Supabase auth bridge: an edge function that exchanges a Firebase ID token for a Supabase custom JWT session. This makes `auth.uid()` work in RLS policies and ensures consistent user IDs.

### Step 1: Create `firebase-auth` Edge Function

A new edge function that:
- Receives a Firebase ID token from the client
- Verifies it against Firebase's public keys
- Looks up or creates the user in `auth.users` using `supabase.auth.admin.createUser()` / `generateLink()`
- Returns a Supabase session (access_token + refresh_token)

The Supabase user ID will be set to match the Firebase UID, ensuring consistency.

### Step 2: Update `AppContext.tsx` — Sign into Supabase After Firebase Auth

After Firebase `onAuthStateChanged` fires with a logged-in user:
- Get the Firebase ID token via `fbUser.getIdToken()`
- Call the `firebase-auth` edge function to get a Supabase session
- Call `supabase.auth.setSession()` with the returned tokens
- Then proceed with `loadData()` as before

This ensures `auth.uid()` returns the Firebase UID for all subsequent Supabase queries, making RLS work correctly.

### Step 3: Update User Lookup in `loadData()`

Simplify user lookup: after Supabase session is set, query `users` by `id = auth.uid()` (which equals Firebase UID). If not found, create with that ID. Remove the phone-based lookup fallback for the primary user record.

### Step 4: Migrate Existing User Records (Migration)

Add a database migration that updates existing user records' `id` to match their Firebase UID where possible, or add a `firebase_uid` column to support the mapping. This handles users created before the Firebase auth switch.

### Technical Details

- The edge function will use the `FIREBASE_PROJECT_ID` secret (already configured) to verify Firebase tokens via Google's public JWKS endpoint
- Supabase Admin API (`auth.admin`) is available in edge functions via the service role key
- The client-side flow adds ~100ms latency on login for the token exchange
- All existing RLS policies remain unchanged since `auth.uid()` will now return the correct value

### Files Changed
- `supabase/functions/firebase-auth/index.ts` (new)
- `src/context/AppContext.tsx` (add Supabase session bridge)
- `src/App.tsx` (add Supabase session setup in ProtectedRoute)
- Database migration for any existing user ID alignment

