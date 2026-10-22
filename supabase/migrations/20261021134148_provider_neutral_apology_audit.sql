-- Keep applied function logic and grants intact; only future draft audit wording changes.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('exception_private.portal_command(text,jsonb)'::regprocedure);
  if position('Gemini apology draft saved; not published' in definition) = 0 then
    raise exception 'Expected draft audit message was not found; review the current function before migration';
  end if;
  execute replace(definition, 'Gemini apology draft saved; not published', 'AI apology draft saved; not published');
end $$;
