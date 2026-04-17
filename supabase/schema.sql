-- ContentOS Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- TABLES
-- =====================

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  copy text not null default '',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  scheduled_at timestamptz,
  parent_post_id uuid references posts(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists post_channels (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  channel_id uuid references channels(id) on delete cascade not null,
  copy_override text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  unique(post_id, channel_id)
);

create table if not exists media_files (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  url text not null,
  type text not null check (type in ('image', 'video')),
  size_bytes bigint not null default 0
);

-- =====================
-- SEED CHANNELS
-- =====================

insert into channels (name, slug) values
  ('Instagram', 'instagram'),
  ('LinkedIn', 'linkedin'),
  ('X', 'x')
on conflict (slug) do nothing;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table posts enable row level security;
alter table post_channels enable row level security;
alter table media_files enable row level security;
alter table channels enable row level security;

-- Channels: readable by all authenticated users
create policy "Channels are viewable by authenticated users"
  on channels for select
  to authenticated
  using (true);

-- Posts: users own their posts
create policy "Users can view own posts"
  on posts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own posts"
  on posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on posts for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Post channels: via post ownership
create policy "Users can view own post_channels"
  on post_channels for select
  to authenticated
  using (exists (select 1 from posts where posts.id = post_channels.post_id and posts.user_id = auth.uid()));

create policy "Users can insert own post_channels"
  on post_channels for insert
  to authenticated
  with check (exists (select 1 from posts where posts.id = post_channels.post_id and posts.user_id = auth.uid()));

create policy "Users can update own post_channels"
  on post_channels for update
  to authenticated
  using (exists (select 1 from posts where posts.id = post_channels.post_id and posts.user_id = auth.uid()));

create policy "Users can delete own post_channels"
  on post_channels for delete
  to authenticated
  using (exists (select 1 from posts where posts.id = post_channels.post_id and posts.user_id = auth.uid()));

-- Media files: via post ownership
create policy "Users can view own media_files"
  on media_files for select
  to authenticated
  using (exists (select 1 from posts where posts.id = media_files.post_id and posts.user_id = auth.uid()));

create policy "Users can insert own media_files"
  on media_files for insert
  to authenticated
  with check (exists (select 1 from posts where posts.id = media_files.post_id and posts.user_id = auth.uid()));

create policy "Users can update own media_files"
  on media_files for update
  to authenticated
  using (exists (select 1 from posts where posts.id = media_files.post_id and posts.user_id = auth.uid()));

create policy "Users can delete own media_files"
  on media_files for delete
  to authenticated
  using (exists (select 1 from posts where posts.id = media_files.post_id and posts.user_id = auth.uid()));

-- =====================
-- STORAGE BUCKET
-- =====================

-- Run in Storage settings or via SQL:
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Media files are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'media');

create policy "Users can update own media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
