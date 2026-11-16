create table if not exists categories (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_name_lower_idx on categories (lower(name));

create table if not exists reels (
  id serial primary key,
  url text unique not null,
  caption text,
  thumbnail_url text,
  category_id int references categories(id),
  confidence real,
  summary text,
  tags text[] not null default '{}',
  github_links text[] not null default '{}',
  youtube_links text[] not null default '{}',
  web_links text[] not null default '{}',
  status text not null check (status in ('sorted','review','pending')),
  search tsvector,
  created_at timestamptz not null default now()
);
alter table reels add column if not exists web_links text[] not null default '{}';
create index if not exists reels_search_idx on reels using gin (search);
create index if not exists reels_category_idx on reels (category_id);

create or replace function reels_search_update() returns trigger as $$
declare cat text;
begin
  select name into cat from categories where id = new.category_id;
  new.search := to_tsvector('simple',
    coalesce(new.caption,'') || ' ' || coalesce(new.summary,'') || ' ' ||
    coalesce(array_to_string(new.tags,' '),'') || ' ' || coalesce(cat,''));
  return new;
end $$ language plpgsql;

drop trigger if exists reels_search_trg on reels;
create trigger reels_search_trg before insert or update on reels
  for each row execute function reels_search_update();
