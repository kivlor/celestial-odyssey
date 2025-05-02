drop function if exists search_stars(vector(1536), float, int);

create function search_stars (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  repo text,
  readme text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    stars.id,
    stars.repo,
    stars.readme,
    stars.created_at,
    1 - (stars.embedding <=> query_embedding) as similarity
  from stars
  where 1 - (stars.embedding <=> query_embedding) > match_threshold
  order by (stars.embedding <=> query_embedding) asc
  limit match_count;
$$;
