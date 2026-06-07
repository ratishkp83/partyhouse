-- ============================================================
-- Contact form submissions table
-- Run in: Supabase → SQL Editor → New Query
-- ============================================================

create table if not exists contact_submissions (
  id           uuid primary key default gen_random_uuid(),
  subject      text not null check (subject in ('inquiry','feedback','bug','grievance')),
  message      text not null check (length(message) between 10 and 2000),
  user_id      uuid references profiles(id) on delete set null, -- null if unauthenticated
  user_email   text,                                            -- captured from auth if available
  created_at   timestamptz default now()
);

-- Anyone can insert (authenticated or not)
alter table contact_submissions enable row level security;

create policy "Anyone can submit contact form"
  on contact_submissions for insert
  with check (length(message) between 10 and 2000);

-- Only admins can read submissions
create policy "Admins can read submissions"
  on contact_submissions for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
