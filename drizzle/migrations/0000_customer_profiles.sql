CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
 phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own customer profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Update own customer profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE FUNCTION public.create_customer_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
  INSERT INTO public.profiles (id, name, phone) VALUES (NEW.id, NEW.raw_user_meta_data->>'name', '+' || ltrim(NEW.phone, '+'));
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER on_customer_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile();