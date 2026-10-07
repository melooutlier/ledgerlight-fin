-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Subscriptions (plan)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'pessoal',
  status text NOT NULL DEFAULT 'active',
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin can read profiles
CREATE POLICY "admin read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.profiles ADD COLUMN email text;

-- Accounts
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'mpesa',
  initial_balance numeric NOT NULL DEFAULT 0,
  is_savings boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts" ON public.accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transactions ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN image_path text;
ALTER TABLE public.transactions ADD COLUMN confirmed boolean NOT NULL DEFAULT true;
ALTER TABLE public.transactions ADD COLUMN transfer_group uuid;
ALTER TABLE public.loan_payments ADD COLUMN image_path text;
ALTER TABLE public.loan_payments ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Savings goals
CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎯',
  target_amount numeric NOT NULL,
  saved_amount numeric NOT NULL DEFAULT 0,
  target_date date,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.savings_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Household fixed bills (Plano Casa)
CREATE TABLE public.household_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏠',
  amount numeric NOT NULL,
  due_day int NOT NULL DEFAULT 1,
  member text,
  last_paid_month date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_bills TO authenticated;
GRANT ALL ON public.household_bills TO service_role;
ALTER TABLE public.household_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bills" ON public.household_bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER household_bills_updated_at BEFORE UPDATE ON public.household_bills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill existing users
INSERT INTO public.subscriptions (user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id;
INSERT INTO public.accounts (user_id, name, type) SELECT id, 'Carteira principal', 'dinheiro' FROM auth.users;
INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE email = 'justminimalclothing@gmail.com' ON CONFLICT DO NOTHING;

-- Extend signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_extras()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.accounts (user_id, name, type) VALUES (NEW.id, 'Carteira principal', 'dinheiro');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_extras() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_extras AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_extras();

-- Storage policies for receipts bucket (private, folder = user id)
CREATE POLICY "receipts own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "receipts own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "receipts own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);