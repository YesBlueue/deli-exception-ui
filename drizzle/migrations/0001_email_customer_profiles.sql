CREATE TABLE public.customer_email_profiles (
 id uuid PRIMARY KEY REFERENCES public.profiles(id) DEFERRABLE INITIALLY DEFERRED,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
 email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_email_profiles TO authenticated;
GRANT ALL ON public.customer_email_profiles TO service_role;
ALTER TABLE public.customer_email_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own email customer profile" ON public.customer_email_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
ALTER TABLE public.customer_email_profiles DROP CONSTRAINT customer_email_profiles_id_fkey;
CREATE OR REPLACE FUNCTION public.create_customer_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
  INSERT INTO public.profiles (id, name, phone) VALUES (NEW.id, coalesce(nullif(btrim(NEW.raw_user_meta_data->>'name'), ''), 'Customer'), '+' || ltrim(NEW.phone, '+'));
 ELSIF NEW.email IS NOT NULL AND NEW.email <> '' THEN
  INSERT INTO public.customer_email_profiles (id, name, email) VALUES (NEW.id, coalesce(nullif(btrim(NEW.raw_user_meta_data->>'name'), ''), 'Customer'), NEW.email);
 END IF;
 RETURN NEW;
END;
$$;