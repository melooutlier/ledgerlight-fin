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
- Plan gating lives in src/lib/plans.ts (pure, tested) and is read via usePlan(); why: one source of truth for features per plan.
- Admin rights come only from the user_roles table via has_role(); why: avoid privilege escalation.
- Receipt photos go to the private "receipts" bucket under <user_id>/ and are shown via signed URLs; why: photos are private.
