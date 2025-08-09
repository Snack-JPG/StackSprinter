-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table for user data
create table public.profiles (
  id uuid references auth.users(id) primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Create examples table for demo data
create table public.examples (
  id bigserial primary key,
  label text not null,
  description text,
  category text,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on examples
alter table public.examples enable row level security;

-- Create policies for examples (read-only for anonymous users)
create policy "Examples are viewable by everyone."
  on public.examples for select
  using ( true );

create policy "Authenticated users can insert examples."
  on public.examples for insert
  to authenticated
  with check ( true );

create policy "Authenticated users can update examples."
  on public.examples for update
  to authenticated
  using ( true );

create policy "Authenticated users can delete examples."
  on public.examples for delete
  to authenticated
  using ( true );

-- Create function to automatically update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_examples
  before update on public.examples
  for each row execute procedure public.handle_updated_at();

-- Create function to handle new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'username', new.email),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create indexes for better performance
create index profiles_username_idx on public.profiles using btree (username);
create index examples_created_at_idx on public.examples using btree (created_at desc);
create index examples_category_idx on public.examples using btree (category);
create index examples_is_active_idx on public.examples using btree (is_active);

-- Create a view for public profile data
create or replace view public.public_profiles as
  select id, username, full_name, avatar_url, created_at
  from public.profiles;

-- Grant access to the view
grant select on public.public_profiles to anon, authenticated;

-- Create storage bucket for user uploads (optional)
insert into storage.buckets (id, name, public) 
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Create storage policies
create policy "Public uploads are accessible by everyone"
  on storage.objects for select
  using ( bucket_id = 'uploads' );

create policy "Authenticated users can upload files"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'uploads' );

create policy "Users can update their own uploads"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own uploads"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1] );

-- Add helpful comments
comment on table public.profiles is 'User profile data';
comment on table public.examples is 'Example data for demonstration purposes';
comment on function public.handle_updated_at() is 'Automatically updates the updated_at column';
comment on function public.handle_new_user() is 'Creates a profile for new authenticated users';