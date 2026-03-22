
-- Tighten insert policy: only allow inserting links for your own patient_id
DROP POLICY IF EXISTS "Authenticated users can insert caregiver_links" ON public.caregiver_links;
CREATE POLICY "Users can insert own caregiver links"
ON public.caregiver_links
FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());
