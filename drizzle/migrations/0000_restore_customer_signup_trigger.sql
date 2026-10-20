DROP TRIGGER IF EXISTS on_customer_signup ON auth.users;
CREATE TRIGGER on_customer_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile();