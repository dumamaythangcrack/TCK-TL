-- ==============================================================================
-- TCK Tài Liệu - Supabase PostgreSQL Schema
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
create type user_role as enum ('user', 'moderator', 'admin');
create type document_status as enum ('pending', 'approved', 'rejected');
create type school_level as enum ('primary', 'secondary', 'high_school', 'university');

-- 3. TABLES

-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  bio text,
  role user_role default 'user'::user_role not null,
  total_uploads integer default 0,
  total_downloads integer default 0,
  is_locked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories & Taxonomy
create table categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table grades (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  level school_level not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table subjects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Document Bundles (The main entity)
create table document_bundles (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text not null unique,
  description text,
  uploader_id uuid references profiles(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  grade_id uuid references grades(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  status document_status default 'pending'::document_status not null,
  is_featured boolean default false,
  total_size_bytes bigint default 0,
  view_count integer default 0,
  download_count integer default 0,
  like_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Full Text Search column
  fts tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored
);

-- Document Files (Files inside a bundle)
create table document_files (
  id uuid default uuid_generate_v4() primary key,
  bundle_id uuid references document_bundles(id) on delete cascade not null,
  file_name text not null,
  original_name text not null,
  file_size_bytes bigint not null,
  mime_type text not null,
  file_extension text not null,
  r2_key text not null, -- The object key in Cloudflare R2
  is_primary boolean default false,
  sort_order integer default 0,
  thumbnail_key text, -- Optional thumbnail in R2
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tags
create table tags (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  slug text not null unique
);

create table document_tags (
  bundle_id uuid references document_bundles(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (bundle_id, tag_id)
);

-- Interactions
create table document_likes (
  user_id uuid references profiles(id) on delete cascade,
  bundle_id uuid references document_bundles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, bundle_id)
);

create table bookmarks (
  user_id uuid references profiles(id) on delete cascade,
  bundle_id uuid references document_bundles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, bundle_id)
);

create table document_comments (
  id uuid default uuid_generate_v4() primary key,
  bundle_id uuid references document_bundles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  parent_id uuid references document_comments(id) on delete cascade,
  is_deleted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Analytics & Logs
create table download_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  bundle_id uuid references document_bundles(id) on delete set null,
  file_id uuid references document_files(id) on delete set null,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table ai_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  prompt text not null,
  response text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ROW LEVEL SECURITY (RLS)
alter table profiles enable row level security;
alter table categories enable row level security;
alter table grades enable row level security;
alter table subjects enable row level security;
alter table document_bundles enable row level security;
alter table document_files enable row level security;
alter table document_comments enable row level security;
alter table document_likes enable row level security;
alter table bookmarks enable row level security;

-- Profiles: Public read, owner update
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Taxonomy: Public read
create policy "Taxonomy viewable by everyone" on categories for select using (true);
create policy "Taxonomy viewable by everyone" on grades for select using (true);
create policy "Taxonomy viewable by everyone" on subjects for select using (true);

-- Document Bundles: Public can view approved, owner can view all, admin/mod view all
create policy "Approved bundles are viewable by everyone" on document_bundles for select
  using (status = 'approved'::document_status);
create policy "Users can view their own bundles" on document_bundles for select
  using (auth.uid() = uploader_id);
create policy "Users can insert bundles" on document_bundles for insert
  with check (auth.uid() = uploader_id);
create policy "Users can update own pending bundles" on document_bundles for update
  using (auth.uid() = uploader_id and status = 'pending'::document_status);

-- Document Files: Inherit from bundle logic roughly
create policy "Files of approved bundles are viewable" on document_files for select
  using (
    exists (
      select 1 from document_bundles
      where document_bundles.id = document_files.bundle_id
      and document_bundles.status = 'approved'::document_status
    )
  );
create policy "Owners can view own files" on document_files for select
  using (
    exists (
      select 1 from document_bundles
      where document_bundles.id = document_files.bundle_id
      and document_bundles.uploader_id = auth.uid()
    )
  );
create policy "Users can insert files to own bundles" on document_files for insert
  with check (
    exists (
      select 1 from document_bundles
      where document_bundles.id = bundle_id
      and document_bundles.uploader_id = auth.uid()
    )
  );

-- Interactions
create policy "Likes viewable by everyone" on document_likes for select using (true);
create policy "Users can insert own likes" on document_likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes" on document_likes for delete using (auth.uid() = user_id);

create policy "Bookmarks viewable by owner" on bookmarks for select using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookmarks" on bookmarks for delete using (auth.uid() = user_id);

create policy "Comments viewable by everyone" on document_comments for select using (true);
create policy "Users can insert own comments" on document_comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on document_comments for update using (auth.uid() = user_id);

-- 5. TRIGGERS

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to index search (handled by generated column above natively in postgres 12+)

-- Indexes for performance
create index if not exists idx_document_bundles_fts on document_bundles using gin(fts);
create index if not exists idx_document_bundles_status on document_bundles(status);
create index if not exists idx_document_bundles_uploader on document_bundles(uploader_id);
create index if not exists idx_document_files_bundle on document_files(bundle_id);

-- ==============================================================================
-- TCK Tài Liệu - Additional Production Tables (Phase 2 & AI Upgrades)
-- ==============================================================================

-- 6. ADDITIONAL TABLES

-- Document Reports
create table if not exists document_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  bundle_id uuid references document_bundles(id) on delete cascade not null,
  reason text not null,
  description text,
  status text default 'pending' not null, -- 'pending', 'resolved'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  is_read boolean default false not null,
  type text not null, -- 'info', 'approval', 'comment', 'like', 'report'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Chats (History of interactive chat threads)
create table if not exists ai_chats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Messages (Individual messages inside an AI chat thread)
create table if not exists ai_messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references ai_chats(id) on delete cascade not null,
  role text not null, -- 'user', 'model'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Admin Audit Logs
create table if not exists admin_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for additional tables
alter table document_reports enable row level security;
alter table notifications enable row level security;
alter table ai_chats enable row level security;
alter table ai_messages enable row level security;
alter table admin_logs enable row level security;

-- Policies for additional tables
create policy "Users can view and insert own reports" on document_reports for all using (auth.uid() = user_id);
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);
create policy "Users can manage own AI chats" on ai_chats for all using (auth.uid() = user_id);
create policy "Users can manage own AI messages" on ai_messages for all using (
  exists (
    select 1 from ai_chats
    where ai_chats.id = ai_messages.chat_id
    and ai_chats.user_id = auth.uid()
  )
);

