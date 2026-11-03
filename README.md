# Track Mo, Pake ko!

Personal expense tracker. React + TypeScript (Vite) frontend, Supabase backend (Postgres, Auth, Row Level Security), Brevo for email.

## 1. Run it on Linux Mint

```bash
cd track-mo-pake-ko
npm install
cp .env.example .env.local      # then paste your real Supabase values into .env.local
npm run dev                     # opens http://localhost:5173
```

`.env.local` needs two lines (Supabase > Connect):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Never put a `sb_secret_...` or `service_role` key in this project.

## 2. Create the database

1. Supabase dashboard > **SQL Editor** > New query.
2. Paste all of `supabase/migrations/001_schema.sql` and press **Run**.
   It creates the tables, security rules (RLS), functions, the 8 default categories and 18 lessons.

## 3. Supabase settings

- **Authentication > URL Configuration**: Site URL `http://localhost:5173`, and add `http://localhost:5173/reset-password` and `http://localhost:5173/login` to Redirect URLs.
- **Authentication > Sign In / Providers > Email**: keep email sign in on. For testing you can turn "Confirm email" off so sign up logs in at once.
- **Authentication > Multi-Factor**: make sure TOTP (authenticator app) is enabled. Admins use it for the 6-digit code.
- **Authentication > SMTP Settings** (Brevo), so password reset emails are sent:
  - Host `smtp-relay.brevo.com`, port `587`
  - Username and password: the SMTP login and key from Brevo > SMTP & API
  - Sender email: an address you verified in Brevo
  - In Brevo, turn off link tracking, or reset links may break.

## 4. Make your first admin

1. Run the app, go to **Create an account**, and sign up with your email.
2. In the SQL Editor run (use your email):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

3. On the log in page switch the toggle (bottom right) to **Admin**, enter your email and password and any 6 digits. The first time, you scan a QR code with Google Authenticator or Authy and enter the code. After that, the app asks for the 6-digit code at every admin log in.

Admin rights in the database also require that 6-digit step (the `is_admin()` function checks it), so a password alone is not enough.

## 5. What is included

User: log in, sign up, forgot and reset password, first-login category picker, dashboard (totals, category icons, financial literacy, charts, recent transactions, budget progress), add expense with quick-add icons and budget warning, expense list with filters and delete, budgets with alert settings, reports (monthly and yearly), CSV export (detailed, category summary, monthly summary), archive (archive, view, restore, download), settings (profile, password, preferences, tracked categories, export all data, delete account), financial literacy hub and lessons.

Admin: separate log in with 6-digit code, overview, users and admins lists (reset password, suspend, reactivate, add admin), default categories (add, edit, icon, color, disable), system reports, audit log.

Also: idle timeout (30 minutes users, 15 minutes admins), login lockout message after 5 failed tries, and the error messages from the validation tables.

## 6. Not built yet (next steps)

- Editing an existing expense (you can delete and add again).
- The "possible duplicate expense" warning.
- "+ Add user" for admins. Users sign up on their own; admins can make an existing account an admin.
- Budget alert emails through Brevo (needs a Supabase Edge Function and a schedule).
- Suspension blocks the app, but a suspended person's login token stays valid until it expires. Banning in Supabase Auth needs an Edge Function with the service key.
- PDF export uses the browser's Print > Save as PDF. The Excel icon downloads a CSV, which Excel opens.
- The login lockout counter lives in the browser. Supabase also rate limits sign in attempts on the server.
- Automated tests.

## 7. Free plan reminders

Supabase free projects pause after a week of inactivity, so open the project before a demo. Brevo's free plan has a daily email limit.
