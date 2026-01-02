-- Insert user_role for the existing profile user to the existing workspace
INSERT INTO public.user_roles (user_id, workspace_id, role)
VALUES ('05f80846-2c10-4dab-9c98-0752cc71a00f', '02857397-29ba-4e31-80e0-0eb0d55a14de', 'OWNER')
ON CONFLICT (user_id, workspace_id) DO NOTHING;

-- Also update their profile to link to this workspace
UPDATE public.profiles 
SET workspace_id = '02857397-29ba-4e31-80e0-0eb0d55a14de'
WHERE id = '05f80846-2c10-4dab-9c98-0752cc71a00f';