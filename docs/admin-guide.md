# Admin Guide

Quick reference for managing the HIIT app via its built-in admin dashboard.

---

## Becoming an admin

Admin access is stored in `public.user_roles` with the `app_role` enum. There is no UI for promoting a user — the first admin must be granted directly from the Supabase SQL editor.

1. **Sign up** in the app as normal (this creates a row in `auth.users`).
2. Open the Supabase dashboard → **SQL Editor**.
3. Find your user ID:

   ```sql
   SELECT id, email FROM auth.users WHERE email = 'you@example.com';
   ```

4. Grant yourself the admin role:

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('<paste-your-user-id-here>', 'admin');
   ```

5. Refresh the app. The "Admin" entry in the nav menu should now be visible.

Once you have at least one admin, you can promote additional admins from the Admin Users page.

## Admin routes

All admin pages are gated by `AdminRoute` which checks `has_role(auth.uid(), 'admin')`.

| Route | Purpose |
|---|---|
| `/admin` | Dashboard overview (user/workout/meal counts, recent activity) |
| `/admin/users` | View user list, manage roles, delete accounts |
| `/admin/workouts` | Add/edit workouts and exercises (this is where video URLs go once the founder films the starter set) |
| `/admin/meals` | Manage the recipe catalogue |
| `/admin/coaches` | Coach profiles (not in MVP — deferred per content strategy) |
| `/admin/badges` | Achievement badges |
| `/admin/community` | Moderate community posts / reports |
| `/admin/analytics` | Usage analytics |
| `/admin/notifications` | Send / schedule push notifications |
| `/admin/subscriptions` | Subscription tier management (blocked until IAP is wired via RevenueCat) |
| `/admin/settings` | App settings, branding, feature flags |
| `/admin/layout` | Configure which sections appear on the home screen |

## Known limitations

- **No bulk import UI yet.** Seeded workouts and badges currently come from the `20260422071604_*.sql` migration. Adding 20+ items via the Admin Workouts UI is tedious; if we're going to seed a lot more, we should add CSV import.
- **Coaches page** exists but is deferred content-wise. Leaving it functional for the future.
- **Subscriptions page** will be fully wired once IAP (RevenueCat / StoreKit / Google Play Billing) is integrated. Until then, you can view tiers in the DB but not manage live subscribers.
- **No audit log.** Changes made via admin are persisted but not tracked. If multiple admins start editing content, a `content_audit_log` table would be a sensible add.

## Safety notes

- The `user_roles` table has RLS — users can only see their own roles, and role changes require admin.
- The `has_role()` function is `SECURITY DEFINER` to prevent RLS recursion. It's well-reviewed in the migration.
- Never expose the service role key or run arbitrary SQL from client code — the admin dashboard uses the same row-level policies as any other authenticated user, gated by `has_role`.
