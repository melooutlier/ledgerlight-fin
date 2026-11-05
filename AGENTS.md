<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Public discovery lives at `/`, `/funcionalidades` and `/precos`; the protected financial overview lives at `/inicio`; why: visitors can review membership before signing in without exposing private records.
- Public pricing and payment dialogs consume the shared plan configuration; why: membership prices and payment details stay consistent with authenticated upgrades.
- Plan gating lives in src/lib/plans.ts (pure, tested) and is read via usePlan(); why: one source of truth for features per plan.
- Admin rights come only from the user_roles table via has_role(); why: avoid privilege escalation.
- Receipt photos go to the private "receipts" bucket under <user_id>/ and are shown via signed URLs; why: photos are private.
- Shared shell and UI primitives own responsive navigation, touch targets and safe-area spacing; why: consistent phone and desktop behavior without changing financial logic.
- Smart-notification processing stays in the existing melfy-notifications Edge Function; the managed HTTP schedule calls the TanStack route /api/public/jobs/melfy-notifications, which authenticates via authenticateCronRequest and forwards with the service credential; why: minute-level Web Push scheduling stays on the platform's managed scheduler without exposing secrets.
