-- Attach handle_new_user trigger so signups always create profile + role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow school admins to insert/update profiles for users in their school
DROP POLICY IF EXISTS profiles_school_admin_insert ON public.profiles;
CREATE POLICY profiles_school_admin_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND school_id = current_school_id()
  );

DROP POLICY IF EXISTS profiles_school_admin_update ON public.profiles;
CREATE POLICY profiles_school_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND school_id = current_school_id()
  );

-- Allow school admins to assign roles to users they manage in their school
DROP POLICY IF EXISTS roles_school_admin_write ON public.user_roles;
CREATE POLICY roles_school_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.school_id = current_school_id()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND role IN ('staff'::app_role, 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.school_id = current_school_id()
    )
  );