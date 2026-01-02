-- Fix onboarding workspace creation: RETURNING requires SELECT, but user has no role yet.
-- Add created_by to allow the creator to SELECT the workspace immediately after INSERT.

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS created_by uuid;

-- Set default for new rows
ALTER TABLE public.workspaces
ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Replace SELECT/INSERT policies to include created_by rule
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.workspace_id = workspaces.id
      AND user_roles.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces"
ON public.workspaces
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- Keep existing UPDATE policy as-is (owner-only)
