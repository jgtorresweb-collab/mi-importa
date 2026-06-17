-- Execute este SQL no Supabase > SQL Editor

-- Tabela de produtos
create table if not exists products (
  id text primary key,
  nome text not null,
  modelo text,
  marca text,
  categoria text,
  cor text,
  qtd integer default 1,
  importador text,
  cc text,
  tipo text default 'proprio',
  comissao numeric default 0,
  custo numeric default 0,
  moeda text default 'BRL',
  cambio numeric default 1,
  "dataAquisicao" text,
  "lucroPct" numeric default 0,
  preco numeric not null,
  fotos jsonb default '[]',
  obs text,
  created_at text
);

-- Tabela de vendas
create table if not exists sales (
  id text primary key,
  "productId" text,
  "productName" text,
  "productPreco" numeric,
  comprador text,
  indicacao text,
  tel text,
  pagto text,
  date text,
  installments jsonb default '[]'
);

-- Tabela de importadores
create table if not exists importers (
  id text primary key,
  nome text not null,
  doc text,
  tipo text default 'pf',
  tel text,
  email text,
  obs text
);

-- Bucket de fotos no Storage (execute separado se necessário)
-- Vá em Storage > New bucket > nome: mi-importa > Public: true
