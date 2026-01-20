create table if not exists club_hidden_visitors (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references clubs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(club_id, user_id)
);

-- Enable RLS
alter table club_hidden_visitors enable row level security;

-- Policies
create policy "Club admins can insert hidden visitors"
  on club_hidden_visitors for insert
  to authenticated
  with check (
    exists (
      select 1 from club_admins
      where club_admins.club_id = club_hidden_visitors.club_id
      and club_admins.user_id = auth.uid()
    )
    or
    exists (
      select 1 from clubs
      where clubs.id = club_hidden_visitors.club_id
      and clubs.owner_id = auth.uid()
    )
  );

create policy "Club admins can select hidden visitors"
  on club_hidden_visitors for select
  to authenticated
  using (
    exists (
      select 1 from club_admins
      where club_admins.club_id = club_hidden_visitors.club_id
      and club_admins.user_id = auth.uid()
    )
    or
    exists (
      select 1 from clubs
      where clubs.id = club_hidden_visitors.club_id
      and clubs.owner_id = auth.uid()
    )
  );

create policy "Club admins can delete hidden visitors"
  on club_hidden_visitors for delete
  to authenticated
  using (
    exists (
      select 1 from club_admins
      where club_admins.club_id = club_hidden_visitors.club_id
      and club_admins.user_id = auth.uid()
    )
    or
    exists (
      select 1 from clubs
      where clubs.id = club_hidden_visitors.club_id
      and clubs.owner_id = auth.uid()
    )
  );
