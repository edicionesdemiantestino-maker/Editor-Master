-- Créditos por uso (saldo + ledger) con consumo atómico vía RPC.

-- 1) Saldo por usuario
create table if not exists public.user_credit_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_credit_balances enable row level security;

drop policy if exists "own balance" on public.user_credit_balances;
create policy "own balance"
  on public.user_credit_balances
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No permitir writes desde el cliente (solo RPC / service_role).
revoke insert, update, delete on public.user_credit_balances from anon, authenticated;

-- 2) Ledger inmutable
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta bigint not null,
  reason text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

-- Idempotencia por referencia (compra / jobId / requestId).
create unique index if not exists credit_ledger_reason_reference_uniq
  on public.credit_ledger (reason, reference_id)
  where reference_id is not null;

alter table public.credit_ledger enable row level security;

drop policy if exists "own ledger" on public.credit_ledger;
create policy "own ledger"
  on public.credit_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No permitir writes desde el cliente (solo RPC / service_role).
revoke insert, update, delete on public.credit_ledger from anon, authenticated;

-- 3) RPC atómica: consumir créditos (autenticado) - idempotente por (reason, ref)
create or replace function public.consume_credits(
  p_amount bigint,
  p_reason text,
  p_ref text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid;
  current_balance bigint;
  inserted_id uuid;
  soft_limit bigint;
  hard_limit bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  if p_amount is null or p_amount <= 0 then
    return true;
  end if;

  -- Modelo híbrido: permitir pequeño overdraft (soft/hard) para UX.
  -- soft: permitir hasta -10 (solo warning en app); hard: bloquear si quedaría < -20.
  soft_limit := -10;
  hard_limit := -20;

  -- Idempotencia: si ya existe un ledger con (reason, ref), no consumir dos veces.
  if p_ref is not null and length(p_ref) > 0 then
    select id into inserted_id
    from public.credit_ledger
    where user_id = v_uid and reason = p_reason and reference_id = p_ref
    limit 1;
    if found then
      return true;
    end if;
  end if;

  -- Lock de saldo por usuario.
  select balance into current_balance
  from public.user_credit_balances
  where user_id = v_uid
  for update;

  if current_balance is null then
    -- Free incluye un pequeño saldo inicial (1ra vez).
    insert into public.user_credit_balances(user_id, balance)
    values (v_uid, 5)
    returning balance into current_balance;
  end if;

  -- Hard limit: si el saldo post-consumo quedaría bajo hard_limit, bloqueamos.
  if (current_balance - p_amount) < hard_limit then
    return false;
  end if;

  -- Insert ledger primero (idempotencia hard) y luego decremento saldo.
  insert into public.credit_ledger(user_id, delta, reason, reference_id)
  values (v_uid, -p_amount, p_reason, nullif(p_ref, ''))
  on conflict (reason, reference_id) where reference_id is not null do nothing
  returning id into inserted_id;

  if inserted_id is null then
    -- Ya consumido por otro request.
    return true;
  end if;

  update public.user_credit_balances
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = v_uid;

  return true;
end;
$$;

revoke all on function public.consume_credits(bigint, text, text) from anon;
grant execute on function public.consume_credits(bigint, text, text) to authenticated;

-- 4) RPC: agregar créditos (solo service_role, para webhook Stripe) - idempotente por ref
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount bigint,
  p_ref text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if p_user_id is null then
    return false;
  end if;
  if p_amount is null or p_amount <= 0 then
    return true;
  end if;

  insert into public.credit_ledger(user_id, delta, reason, reference_id)
  values (p_user_id, p_amount, 'purchase', nullif(p_ref, ''))
  on conflict (reason, reference_id) where reference_id is not null do nothing
  returning id into inserted_id;

  if inserted_id is null then
    -- Ya procesado
    return true;
  end if;

  insert into public.user_credit_balances(user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id)
  do update set
    balance = public.user_credit_balances.balance + excluded.balance,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.add_credits(uuid, bigint, text) from anon, authenticated;
grant execute on function public.add_credits(uuid, bigint, text) to service_role;

-- Variante con reason configurable (para créditos mensuales incluidos por suscripción).
create or replace function public.add_credits_with_reason(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_ref text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if p_user_id is null then
    return false;
  end if;
  if p_amount is null or p_amount <= 0 then
    return true;
  end if;
  if p_reason is null or length(p_reason) = 0 then
    p_reason := 'purchase';
  end if;

  insert into public.credit_ledger(user_id, delta, reason, reference_id)
  values (p_user_id, p_amount, left(p_reason, 40), nullif(p_ref, ''))
  on conflict (reason, reference_id) where reference_id is not null do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return true;
  end if;

  insert into public.user_credit_balances(user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id)
  do update set
    balance = public.user_credit_balances.balance + excluded.balance,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.add_credits_with_reason(uuid, bigint, text, text) from anon, authenticated;
grant execute on function public.add_credits_with_reason(uuid, bigint, text, text) to service_role;

