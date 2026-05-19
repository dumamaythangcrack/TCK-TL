-- supabase/migrations/20240601_storage_policies.sql

/*
  Supabase Storage Policies for TCK Tài Liệu
  -------------------------------------------------
  This file creates RLS policies for each bucket to enforce
  - Owner‑only read/write for private buckets
  - Admin‑only read/write where required
  - Service‑role (edge functions) full access
*/

-- Helper function to extract user id from JWT claims
create function public.get_user_id() returns uuid language sql as $$
  select auth.jwt() ->> 'sub'::text;
$$;

-- Policy for private-documents (owner only)
create policy "private_documents_owner"
  on storage.objects
  for all
  using (bucket_id = 'private-documents' and (public.get_user_id() = owner))
  with check (bucket_id = 'private-documents' and (public.get_user_id() = owner));

-- Policy for ai-chat-attachments (participants)
create policy "ai_chat_attachments_owner"
  on storage.objects
  for all
  using (
    bucket_id = 'ai-chat-attachments' and (
      public.get_user_id() = owner
      or auth.role() = 'service_role'
    )
  )
  with check (
    bucket_id = 'ai-chat-attachments' and (
      public.get_user_id() = owner
      or auth.role() = 'service_role'
    )
  );

-- Policy for reports (admin only)
create policy "reports_admin"
  on storage.objects
  for all
  using (bucket_id = 'reports' and auth.role() in ('admin', 'service_role'))
  with check (bucket_id = 'reports' and auth.role() in ('admin', 'service_role'));

-- Policy for moderation (moderator role)
create policy "moderation_moderator"
  on storage.objects
  for all
  using (bucket_id = 'moderation' and auth.role() in ('moderator', 'admin', 'service_role'))
  with check (bucket_id = 'moderation' and auth.role() in ('moderator', 'admin', 'service_role'));

-- Public buckets – allow read for everyone, write only for service role
create policy "public_documents_read"
  on storage.objects
  for select
  using (bucket_id = 'public-documents');

create policy "public_documents_write"
  on storage.objects
  for insert, update, delete
  using (auth.role() = 'service_role');

create policy "avatars_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_write"
  on storage.objects
  for insert, update, delete
  using (auth.role() = 'service_role');

create policy "thumbnails_read"
  on storage.objects
  for select
  using (bucket_id = 'thumbnails');

create policy "thumbnails_write"
  on storage.objects
  for insert, update, delete
  using (auth.role() = 'service_role');

create policy "cdn_cache_read"
  on storage.objects
  for select
  using (bucket_id = 'cdn-cache');

create policy "cdn_cache_write"
  on storage.objects
  for insert, update, delete
  using (auth.role() = 'service_role');

-- ocr-temp: only service role (edge function) can write/read, short‑lived
create policy "ocr_temp_service"
  on storage.objects
  for all
  using (bucket_id = 'ocr-temp' and auth.role() = 'service_role')
  with check (bucket_id = 'ocr-temp' and auth.role() = 'service_role');

-- ai-system: private data, owner only
create policy "ai_system_owner"
  on storage.objects
  for all
  using (bucket_id = 'ai-system' and public.get_user_id() = owner)
  with check (bucket_id = 'ai-system' and public.get_user_id() = owner);

-- Ensure RLS is enabled for storage.objects
alter table storage.objects enable row level security;
