create extension vector with schema extensions;

create table
stars (
  id bigint primary key generated always as identity,
  repo text not null unique,
  readme text not null,
  embedding vector(384),
  created_at timestamptz default now()
);

create or replace function search_stars (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  repo text,
  readme text,
  similarity float
)
language sql stable
as $$
  select
    stars.id,
    stars.repo,
    stars.readme,
    1 - (stars.embedding <=> query_embedding) as similarity
  from stars
  where 1 - (stars.embedding <=> query_embedding) > match_threshold
  order by (stars.embedding <=> query_embedding) asc
  limit match_count;
$$;
