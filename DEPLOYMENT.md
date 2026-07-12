# Deploying with member accounts

1. Create a Supabase project at [supabase.com](https://supabase.com), then open its SQL Editor and run the contents of `supabase-setup.sql`.
2. In Supabase, open **Authentication > Providers > Email** and enable email/password sign-in. For a smoother first release, turn off **Confirm email**; otherwise new members need to confirm their inbox before signing in.
3. Copy the project URL and anonymous key from **Settings > API** into `config.js`. The anonymous key is intentionally public for browser apps; the row-level policies in the SQL file protect every member's private data.
4. In **Authentication > URL Configuration**, add your deployed website's URL as the Site URL and Redirect URL.
5. Deploy these files to any static host such as Netlify, Vercel, or GitHub Pages.

Each account gets its own task list and daily post data, synced to Supabase. Local browser storage is only used as a temporary cache while the page is loading.
