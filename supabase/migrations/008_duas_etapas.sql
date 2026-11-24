-- Elo Saúde · verificação em 2 etapas para profissionais (P-ELO-04, 24/11/2026).
-- A exigência fica NO BANCO: todo acesso clínico de profissional passa por eu_profissional()
-- (consentimento, carteira, agenda, suspender remédio, aceitar QR). Se o profissional ativou o
-- app autenticador (fator TOTP verificado), a sessão só conta como profissional depois do código
-- (aal2). Pular a tela não adianta: com aal1, as políticas simplesmente não reconhecem a pessoa.

create or replace function eu_profissional() returns uuid
language sql stable security definer set search_path = public, auth as $$
  select p.id from public.profissionais p
  where p.user_id = auth.uid()
    and (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
    )
$$;

-- a tela consulta se a pessoa logada precisa do código (sem expor dados de outros)
create or replace function preciso_do_codigo() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.profissionais p where p.user_id = auth.uid())
     and exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
$$;

revoke all on function preciso_do_codigo() from public, anon;
grant execute on function preciso_do_codigo() to authenticated;
