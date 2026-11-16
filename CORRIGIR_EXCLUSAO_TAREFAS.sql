-- =============================================================================
-- Corrige o erro ao excluir tarefa:
--   "new row violates row-level security policy for table tasks" (código 42501)
--
-- Causa: a exclusão é "de leve" (preenche tasks.deleted_at). A política
-- "Somente logados" (CORRIGIR_SEGURANCA_RLS.sql) esconde linhas com
-- deleted_at preenchido (USING deleted_at IS NULL). O Postgres aplica essa
-- regra também à linha NOVA de um UPDATE, então a própria exclusão é recusada.
--
-- Solução: uma função que só faz a exclusão e roda com a permissão do dono
-- da tabela (SECURITY DEFINER). Assim as tarefas excluídas continuam
-- escondidas de quem chama a API direto, e o app consegue excluir.
--
-- Execute no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- Não apaga nem altera dados existentes.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_task(p_task_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  -- Só usuários logados (o GRANT abaixo já restringe; isto é uma segunda trava).
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.tasks
     SET deleted_at = now(),
         updated_at = now()
   WHERE id = p_task_id
     AND deleted_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0; -- false = a tarefa não existe ou já estava excluída
END;
$$;

-- Ninguém sem login pode chamar; só usuários autenticados.
REVOKE ALL ON FUNCTION public.soft_delete_task(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_task(text) TO authenticated;

-- =============================================================================
-- Teste (opcional), ainda no SQL Editor, trocando pelo id de uma tarefa de teste:
--   SELECT public.soft_delete_task('task-1234567890-abcd');
-- Obs.: no SQL Editor não há usuário logado (auth.uid() é nulo), então este teste
-- devolve "Não autenticado". O teste real é excluir uma tarefa pelo app.
-- =============================================================================
