-- Phase 9 design decision: a direct single booking into a slot already
-- shown as available confirms immediately - it does not wait for
-- hairdresser approval. That's what "book in a few seconds" (spec section
-- 78) actually means; approval is specific to *recurring* booking requests
-- (section 29), not one-off ones. The exclusion constraint from Phase 3 is
-- what makes it safe to confirm immediately: the insert either succeeds
-- (no conflict existed) or fails outright (someone else's row already
-- occupies that range) - there's no window where a "pending" status would
-- add anything.
--
-- The Phase 4 policy required status = 'pending' at insert, written before
-- this was decided. Replacing it here rather than leaving a policy whose
-- name and behavior no longer match what the product actually does.
drop policy "appointments: customer creates own pending request" on public.appointments;

create policy "appointments: customer books own confirmed slot" on public.appointments
  for insert with check (
    customer_profile_id = auth.uid() and created_by = auth.uid() and status = 'confirmed'
  );
