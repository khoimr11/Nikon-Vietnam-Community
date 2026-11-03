-- =====================================================================
-- Nikon Atelier · Cộng đồng nhiếp ảnh Nikon Việt Nam
-- Supabase schema: tài khoản email, ảnh chờ duyệt, thích, bình luận,
-- báo cáo vi phạm, lọc từ khoá. Chạy toàn bộ file này một lần trong
-- Supabase Dashboard → SQL Editor → New query → Run.
-- =====================================================================

-- ---------- 1. Hồ sơ thành viên ----------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 40),
  camera        text,
  role          text not null default 'member' check (role in ('member','moderator','admin')),
  created_at    timestamptz not null default now()
);

-- Tạo hồ sơ tự động khi có người đăng ký bằng email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, camera)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Thành viên Nikon'),
    nullif(trim(new.raw_user_meta_data->>'camera'), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ai là người duyệt?
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator','admin')
  );
$$;
grant execute on function public.is_moderator() to anon, authenticated;

-- ---------- 2. Tác phẩm ------------------------------------------------
create table if not exists public.photos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 80),
  story          text check (char_length(story) <= 600),
  genre          text not null,
  camera         text,
  lens           text,
  aperture       text,
  shutter        text,
  iso            text,
  focal          text,
  in_challenge   boolean not null default false,
  month          text not null,                      -- 'YYYY-MM' theo giờ Việt Nam
  storage_path   text not null unique,               -- '<user_id>/<uuid>.jpg' trong bucket photos
  width          int,
  height         int,
  consent        boolean not null check (consent),   -- tác giả xác nhận bản quyền & đồng ý trưng bày
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason  text,
  reviewed_by    uuid references public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists photos_status_idx on public.photos(status, created_at desc);
create index if not exists photos_user_idx   on public.photos(user_id);

-- Ảnh mới luôn ở trạng thái chờ duyệt; giới hạn 5 ảnh / người / ngày
create or replace function public.photos_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status        := 'pending';
  new.reject_reason := null;
  new.reviewed_by   := null;
  new.reviewed_at   := null;
  if (select count(*) from public.photos
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Mỗi tài khoản gửi tối đa 5 ảnh mỗi ngày';
  end if;
  return new;
end $$;
drop trigger if exists photos_before_insert on public.photos;
create trigger photos_before_insert before insert on public.photos
  for each row execute function public.photos_before_insert();

-- ---------- 3. Thích ---------------------------------------------------
create table if not exists public.likes (
  photo_id    uuid not null references public.photos(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (photo_id, user_id)          -- mỗi tài khoản thích một ảnh một lần
);

-- ---------- 4. Bình luận + lọc từ khoá ---------------------------------
create table if not exists public.banned_terms (
  term text primary key                    -- viết thường, không cần dấu cách thừa
);
-- Một vài mẫu chống spam. Ban quản trị tự bổ sung từ khoá nhạy cảm tại Table Editor.
insert into public.banned_terms(term) values ('http://'),('https://'),('zalo'),('inbox giá')
on conflict do nothing;

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.photos(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 400),
  status      text not null default 'visible' check (status in ('visible','flagged','hidden')),
  created_at  timestamptz not null default now()
);
create index if not exists comments_photo_idx on public.comments(photo_id, created_at);

-- Bình luận chứa từ khoá cấm sẽ bị ẩn chờ người duyệt xem
create or replace function public.comments_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := case
    when exists (select 1 from public.banned_terms t where position(t.term in lower(new.body)) > 0)
    then 'flagged' else 'visible' end;
  return new;
end $$;
drop trigger if exists comments_before_insert on public.comments;
create trigger comments_before_insert before insert on public.comments
  for each row execute function public.comments_before_insert();

-- ---------- 5. Báo cáo vi phạm -----------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.photos(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (photo_id, user_id)
);

-- 3 báo cáo từ 3 tài khoản khác nhau → ảnh tự gỡ khỏi phòng trưng bày, chờ duyệt lại
create or replace function public.reports_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports where photo_id = new.photo_id and not resolved) >= 3 then
    update public.photos
       set status = 'pending', reject_reason = 'Tự gỡ do nhiều báo cáo, chờ duyệt lại'
     where id = new.photo_id and status = 'approved';
  end if;
  return new;
end $$;
drop trigger if exists reports_after_insert on public.reports;
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

-- ---------- 6. Bảng tin công khai --------------------------------------
create or replace view public.photo_feed with (security_invoker = on) as
select p.id, p.user_id, p.title, p.story, p.genre, p.camera, p.lens, p.aperture, p.shutter,
       p.iso, p.focal, p.in_challenge, p.month, p.storage_path, p.width, p.height, p.created_at,
       pr.display_name,
       (select count(*) from public.likes l where l.photo_id = p.id)::int as like_count,
       (select count(*) from public.comments c where c.photo_id = p.id and c.status = 'visible')::int as comment_count
from public.photos p
join public.profiles pr on pr.id = p.user_id
where p.status = 'approved';
grant select on public.photo_feed to anon, authenticated;

-- ---------- 7. Phân quyền (Row Level Security) --------------------------
alter table public.profiles     enable row level security;
alter table public.photos       enable row level security;
alter table public.likes        enable row level security;
alter table public.comments     enable row level security;
alter table public.reports      enable row level security;
alter table public.banned_terms enable row level security;

-- profiles: ai cũng xem được tên hiển thị; mỗi người chỉ sửa tên & máy ảnh của mình, không tự nâng quyền
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select to anon, authenticated using (true);
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (display_name, camera) on public.profiles to authenticated;

-- photos: công khai chỉ ảnh đã duyệt; chủ ảnh thấy ảnh của mình; người duyệt thấy tất cả
drop policy if exists "photos read"        on public.photos;
drop policy if exists "photos insert own"  on public.photos;
drop policy if exists "photos moderate"    on public.photos;
drop policy if exists "photos delete"      on public.photos;
create policy "photos read" on public.photos for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_moderator());
create policy "photos insert own" on public.photos for insert to authenticated
  with check (user_id = auth.uid());
create policy "photos moderate" on public.photos for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy "photos delete" on public.photos for delete to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- likes
drop policy if exists "likes read"   on public.likes;
drop policy if exists "likes insert" on public.likes;
drop policy if exists "likes delete" on public.likes;
create policy "likes read"   on public.likes for select to anon, authenticated using (true);
create policy "likes insert" on public.likes for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.photos p where p.id = photo_id and p.status = 'approved'));
create policy "likes delete" on public.likes for delete to authenticated using (user_id = auth.uid());

-- comments
drop policy if exists "comments read"     on public.comments;
drop policy if exists "comments insert"   on public.comments;
drop policy if exists "comments moderate" on public.comments;
drop policy if exists "comments delete"   on public.comments;
create policy "comments read" on public.comments for select to anon, authenticated
  using ((status = 'visible' and exists (select 1 from public.photos p where p.id = photo_id and p.status = 'approved'))
         or user_id = auth.uid() or public.is_moderator());
create policy "comments insert" on public.comments for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.photos p where p.id = photo_id and p.status = 'approved'));
create policy "comments moderate" on public.comments for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy "comments delete" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- reports: thành viên gửi; chỉ người duyệt đọc và xử lý
drop policy if exists "reports insert"   on public.reports;
drop policy if exists "reports moderate" on public.reports;
drop policy if exists "reports update"   on public.reports;
create policy "reports insert"   on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy "reports moderate" on public.reports for select to authenticated using (public.is_moderator());
create policy "reports update"   on public.reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- banned_terms: chỉ người duyệt xem/sửa
drop policy if exists "terms moderate" on public.banned_terms;
create policy "terms moderate" on public.banned_terms for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- ---------- 8. Kho ảnh (Storage) ----------------------------------------
-- Bucket riêng tư: ảnh chờ duyệt không ai xem được ngoài chủ ảnh và người duyệt.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos objects read"   on storage.objects;
drop policy if exists "photos objects upload" on storage.objects;
drop policy if exists "photos objects delete" on storage.objects;
create policy "photos objects read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'photos' and (
           exists (select 1 from public.photos p where p.storage_path = storage.objects.name and p.status = 'approved')
        or (storage.foldername(name))[1] = auth.uid()::text
        or public.is_moderator()));
create policy "photos objects upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos objects delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));

-- ---------- 9. Cấp quyền người duyệt -----------------------------------
-- Sau khi chính bạn đăng ký tài khoản trên website, chạy dòng dưới (đổi email):
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'email-cua-ban@vhg.vn');
-- Thêm người duyệt khác: thay 'admin' bằng 'moderator'.
