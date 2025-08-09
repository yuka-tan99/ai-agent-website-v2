create extension if not exists vector;

-- Purchases with product_key
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  product_key text check (product_key in ('plan','advisor','expert')) default 'plan',
  amount_cents int not null default 0,
  currency text default 'usd',
  status text check (status in ('pending','paid','refunded')) default 'paid',
  created_at timestamptz default now()
);

create table if not exists kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text,
  source text,
  created_at timestamptz default now()
);

create table if not exists kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references kb_documents(id) on delete cascade,
  chunk_idx int,
  content text,
  embedding vector(1536)
);

create or replace function match_kb_chunks(
  query_embedding vector(1536),
  match_count int default 5
) returns table(content text, document_id uuid, similarity float)
language sql stable as $$
  select content, document_id, 1 - (kb_chunks.embedding <=> query_embedding) as similarity
  from kb_chunks
  where kb_chunks.embedding is not null
  order by kb_chunks.embedding <=> query_embedding
  limit match_count;
$$;
