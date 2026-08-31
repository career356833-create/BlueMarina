# Fish Read-Only Auditor Helper Grant V1

- Generated: 2026-08-30T12:01:23.999Z
- Environment: staging
- Project Ref: mlfvpaikfpjrgrhwlrjn
- Role: blue_marina_readonly_auditor
- Broad grant used: NO
- Mutation RPC grants: 0
- RLS changed: NO

## Granted Helpers

- public.current_fish_role(): SECURITY DEFINER, side effect NO by migration body static audit, EXECUTE NO -> YES
- public.has_fish_role(text): SECURITY INVOKER, side effect NO by migration body static audit, EXECUTE NO -> YES
- public.is_fish_admin(): SECURITY INVOKER, side effect NO by migration body static audit, EXECUTE NO -> YES
- public.is_fish_reviewer(): SECURITY INVOKER, side effect NO by migration body static audit, EXECUTE NO -> YES

No mutation RPC, table write, BYPASSRLS, role attribute, policy, function body, or default privilege changes were made.
