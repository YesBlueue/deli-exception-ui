drop policy seller_context on public.sellers;
create policy seller_context on public.sellers for select to authenticated using(exception_private.is_staff() or exception_private.is_seller(sellers.id) or exists(select 1 from public.delivery_jobs d where d.seller_id=sellers.id and exception_private.owns_delivery(d.id)));
