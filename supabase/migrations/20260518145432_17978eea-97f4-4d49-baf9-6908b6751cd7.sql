CREATE OR REPLACE FUNCTION public.admin_attach_staff(
  _user_id uuid,
  _name text,
  _username text,
  _photo text,
  _staff_role_id uuid,
  _role public.app_role
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_school uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'school_admin'::public.app_role)
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only school admins can attach staff';
  END IF;

  SELECT school_id INTO caller_school FROM public.profiles WHERE id = auth.uid();
  IF caller_school IS NULL THEN
    RAISE EXCEPTION 'Caller has no school';
  END IF;

  IF _role NOT IN ('staff'::public.app_role, 'school_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles
     SET school_id = caller_school,
         staff_role_id = _staff_role_id,
         name = COALESCE(NULLIF(_name,''), name),
         username = COALESCE(NULLIF(_username,''), username),
         photo = _photo
   WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', _user_id;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_attach_staff(uuid, text, text, text, uuid, public.app_role) TO authenticated;