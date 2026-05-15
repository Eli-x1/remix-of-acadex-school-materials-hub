-- Allow school admins to claim a freshly-created staff profile (school_id IS NULL)
DROP POLICY IF EXISTS profiles_school_admin_update ON public.profiles;
CREATE POLICY profiles_school_admin_update ON public.profiles
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND (school_id IS NULL OR school_id = current_school_id())
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_school_id()
);

-- Backfill orphan staff profiles to the only existing school admin's school
UPDATE public.profiles
SET school_id = (
  SELECT school_id FROM public.profiles
  WHERE id IN (SELECT user_id FROM public.user_roles WHERE role = 'school_admin')
  AND school_id IS NOT NULL
  LIMIT 1
)
WHERE school_id IS NULL
  AND id IN (SELECT user_id FROM public.user_roles WHERE role = 'staff');