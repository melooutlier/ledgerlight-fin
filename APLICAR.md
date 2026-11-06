# Como aplicar (4 ficheiros novos + 3 edições pequenas)

## Ficheiros novos (copiar para o repositório, mesmos caminhos)
1. supabase/migrations/20261106120000_melfy_manual_payment_receipts.sql
2. src/lib/payments.ts
3. src/components/activation-screen.tsx
4. src/components/admin-payment-requests.tsx

## Edições

### src/components/app-shell.tsx
- Acrescentar o import:
  import { ActivationScreen } from "@/components/activation-screen";
- Em <main>, trocar `<AccessBlocked />` por `<ActivationScreen />`.
- Apagar a função `AccessBlocked` (já não é usada; `Shield`, `Button` e `useNavigate`
  continuam a ser usados noutros sítios do ficheiro).

### src/routes/_authenticated/admin.tsx
- Acrescentar o import:
  import { PaymentRequestsSection } from "@/components/admin-payment-requests";
- Logo a seguir ao bloco de <Stat ... /> e antes do <Input placeholder="Pesquisar...">, inserir:
  <PaymentRequestsSection />

### src/routes/auth.tsx (opcional, recomendado)
- Nos dois `navigate({ to: search.plan ? "/planos" : "/inicio" })`, usar sempre "/inicio",
  para o cliente novo cair logo no ecrã de ativação (o plano escolhido já vem do metadata).

## Depois
1. Aplicar a migração no Supabase (SQL Editor ou pela integração do Lovable).
2. Regenerar os tipos (src/integrations/supabase/types.ts) — opcional; payments.ts não depende deles.
3. AGENTS.md: acrescentar a regra
   "Comprovativos de subscrição vão para receipts/subscriptions/<user_id>/ e a aprovação passa só
   pela função approve_payment_receipt (admin); why: ativação atómica e sem escalada de privilégios."

## Notas de adaptação ao projeto existente
- A tabela subscriptions já usa `expires_at` (date); por isso a expiração é
  greatest(hoje, expires_at) + 1 mês/1 ano sobre essa coluna (não `current_period_end`).
- `has_active_subscription` e as políticas restritivas das tabelas financeiras já existem
  (migração 20261021080000); não foram duplicadas.
- Subscrições novas já nascem `suspended` sem período grátis (migração existente).
