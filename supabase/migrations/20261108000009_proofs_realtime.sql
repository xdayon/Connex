-- Selo de encontro ao vivo: quando uma pessoa assina a metade dela, o celular da outra
-- atualiza na hora (Supabase Realtime). A política proofs_select já limita quem recebe:
-- só as duas pessoas do encontro.
alter publication supabase_realtime add table public.proofs;
