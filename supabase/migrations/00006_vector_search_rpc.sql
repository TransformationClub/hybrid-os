-- ============================================================
-- Vector similarity search RPC functions for knowledge objects
-- ============================================================

-- Used by src/lib/retrieval/pgvector-adapter.ts
create or replace function match_knowledge_objects(
  query_embedding text,
  workspace_id uuid,
  match_count int default 10,
  threshold float default 0.5
)
returns table (
  id uuid,
  path text,
  title text,
  content text,
  type text,
  similarity float,
  metadata jsonb
)
language plpgsql
stable
security definer
as $$
begin
  return query
    select
      ko.id,
      ko.path,
      ko.title,
      ko.content,
      ko.type::text,
      (1 - (ko.embedding <=> query_embedding::extensions.vector))::float as similarity,
      ko.metadata
    from knowledge_objects ko
    where ko.workspace_id = match_knowledge_objects.workspace_id
      and ko.embedding is not null
      and (1 - (ko.embedding <=> query_embedding::extensions.vector)) >= threshold
    order by ko.embedding <=> query_embedding::extensions.vector
    limit match_count;
end;
$$;

-- Used by src/lib/brain/actions.ts
create or replace function search_knowledge_objects(
  p_workspace_id uuid,
  p_embedding text,
  p_match_count int default 20,
  p_match_threshold float default 0.5
)
returns table (
  id uuid,
  path text,
  title text,
  content text,
  type text,
  source text,
  similarity float,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
as $$
begin
  return query
    select
      ko.id,
      ko.path,
      ko.title,
      ko.content,
      ko.type::text,
      ko.source::text,
      (1 - (ko.embedding <=> p_embedding::extensions.vector))::float as similarity,
      ko.metadata,
      ko.created_at,
      ko.updated_at
    from knowledge_objects ko
    where ko.workspace_id = p_workspace_id
      and ko.embedding is not null
      and (1 - (ko.embedding <=> p_embedding::extensions.vector)) >= p_match_threshold
    order by ko.embedding <=> p_embedding::extensions.vector
    limit p_match_count;
end;
$$;
