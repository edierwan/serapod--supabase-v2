CREATE TABLE public.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    product_group_id uuid NOT NULL REFERENCES public.product_groups(id),
    order_id uuid NOT NULL REFERENCES public.orders(id),
    product_id uuid NOT NULL REFERENCES public.products(id),
    batch_no text,
    total_units integer NOT NULL,
    masters_count integer,
    master_id_mode text,
    label_badge_text_override text,
    label_badge_apply_to text,
    production_date date,
    mfg_facility_code text,
    status text DEFAULT 'pending'::text NOT NULL,
    sid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access based on user_group_roles" ON public.batches;
CREATE POLICY "Allow read access based on user_group_roles"
ON public.batches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_group_roles
    WHERE user_id = auth.uid() AND product_group_id = batches.product_group_id
  )
);
