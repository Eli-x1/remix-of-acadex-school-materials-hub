-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','school_admin','staff');
CREATE TYPE public.class_level AS ENUM ('L3','L4','L5','S1','S2','S3','S4','S5');
CREATE TYPE public.term_code AS ENUM ('T1','T2','T3');
CREATE TYPE public.tracking_status AS ENUM ('completed','pending','overdue');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  name TEXT NOT NULL DEFAULT '',
  photo TEXT,
  school_id UUID,
  staff_role_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ Security definer helpers ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============ SCHOOLS ============
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;

-- ============ STAFF ROLES ============
CREATE TABLE public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_staff_role_id_fkey FOREIGN KEY (staff_role_id) REFERENCES public.staff_roles(id) ON DELETE SET NULL;

-- ============ CLASSES ============
CREATE TABLE public.school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  level public.class_level NOT NULL,
  trade TEXT,
  abbreviation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  parent_phone TEXT NOT NULL DEFAULT '',
  photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ============ MATERIALS ============
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assigned_staff_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- ============ TRACKING ============
CREATE TABLE public.tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  status public.tracking_status NOT NULL DEFAULT 'pending',
  promised_date DATE,
  academic_year INT NOT NULL,
  term public.term_code NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tracking ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tracking_school ON public.tracking(school_id);
CREATE INDEX idx_tracking_student ON public.tracking(student_id);

-- ============ ARCHIVES ============
CREATE TABLE public.term_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year INT NOT NULL,
  term public.term_code NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by TEXT NOT NULL DEFAULT '',
  tracking JSONB NOT NULL DEFAULT '[]'::jsonb,
  students_count INT NOT NULL DEFAULT 0,
  materials_count INT NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.term_archives ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============ TIMESTAMP TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tracking_touch BEFORE UPDATE ON public.tracking
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Auto-create profile + role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'staff';
  END IF;

  INSERT INTO public.profiles (id, email, name, username)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'username');

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid())
         OR (school_id IS NOT NULL AND school_id = public.current_school_id()));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY profiles_admin_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY profiles_admin_delete ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid())
         OR public.has_role(auth.uid(),'school_admin'));
CREATE POLICY roles_super_all ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- schools
CREATE POLICY schools_select ON public.schools FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR id = public.current_school_id());
CREATE POLICY schools_super_write ON public.schools FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- staff_roles
CREATE POLICY staff_roles_select ON public.staff_roles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY staff_roles_admin_write ON public.staff_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND public.has_role(auth.uid(),'school_admin')))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND public.has_role(auth.uid(),'school_admin')));

-- classes
CREATE POLICY classes_select ON public.school_classes FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY classes_write ON public.school_classes FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))));

-- students
CREATE POLICY students_select ON public.students FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY students_write ON public.students FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))));

-- materials
CREATE POLICY materials_select ON public.materials FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY materials_write ON public.materials FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))));

-- tracking
CREATE POLICY tracking_select ON public.tracking FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY tracking_write ON public.tracking FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());

-- archives
CREATE POLICY archives_select ON public.term_archives FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY archives_write ON public.term_archives FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.current_school_id() AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'staff'))));

-- audit
CREATE POLICY audit_select ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());
CREATE POLICY audit_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
