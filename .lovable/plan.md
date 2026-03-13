
# Fix Admin Panel: User Visibility and Data Access

## Problem
The admin panel only shows 1 user (yourself) because the database security policies on the `profiles` table only allow each user to see their own profile. This same issue affects admin stats -- counts for users, activity logs, meal logs, workout progress, and user badges are all under-reported because the admin can only see their own data.

There are 6 users in the database, but the admin sees 1.

## Root Cause
The following tables have SELECT policies restricted to `auth.uid() = user_id` with no admin override:
- `profiles` -- affects user list and total user count
- `activity_logs` -- affects "Active (7d)" stat
- `meal_logs` -- affects "Meals Logged" stat
- `workout_progress` -- affects "Completed" stat
- `user_badges` -- affects "Badges Earned" stat
- `coaching_sessions` -- affects "Sessions" stat

## Solution

### 1. Database Migration: Add Admin SELECT Policies
Add new RLS policies to allow admins to read all rows in the affected tables:

```sql
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all meal logs
CREATE POLICY "Admins can view all meal logs"
  ON public.meal_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all workout progress
CREATE POLICY "Admins can view all workout progress"
  ON public.workout_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all user badges
CREATE POLICY "Admins can view all user badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all coaching sessions
CREATE POLICY "Admins can view all coaching sessions"
  ON public.coaching_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

### 2. Improve AdminUsers Page
Upgrade the User Management page with the AdminLayout for consistent navigation, and add useful features:

- Use `AdminLayout` wrapper instead of custom header (consistent with other admin pages)
- Add pagination (currently limited to 100 users)
- Add role filter tabs (All / Admins / Moderators)
- Show user join date
- Add moderator role management (currently only admin toggle)

### 3. Files Changed

| File | Change |
|------|--------|
| New migration SQL | Add 6 admin SELECT policies |
| `src/pages/admin/AdminUsers.tsx` | Use AdminLayout, add role filters, show join date, add moderator role toggle, increase limit |

### 4. No Changes Needed
- Admin stats hook (`useAdminStats.ts`) -- will automatically show correct numbers once RLS is fixed
- Recent activity hook (`useRecentActivity.ts`) -- profiles query will return all recent signups once RLS is fixed
- Admin dashboard, sidebar, routing -- all working correctly
