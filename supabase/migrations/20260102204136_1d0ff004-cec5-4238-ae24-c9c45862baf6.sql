-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view roles in their workspaces" ON public.user_roles;

-- Create a security definer function to check if user has any role in workspace
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Create non-recursive SELECT policy using auth.uid() directly
CREATE POLICY "Users can view roles in their workspaces"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Also allow users to insert their own role (needed for workspace creation)
DROP POLICY IF EXISTS "Users can create their own role" ON public.user_roles;
CREATE POLICY "Users can create their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());