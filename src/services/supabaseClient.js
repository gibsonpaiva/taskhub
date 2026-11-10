// =============================================================================
// CLIENTE SUPABASE ÚNICO (compartilhado por dados e autenticação)
// A chave "publishable" é feita para ficar no navegador. A proteção real dos dados
// vem das políticas RLS (veja SUPABASE_AUTH_SETUP.sql).
// =============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://yotlwfbkxwaqviqzgtkt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WxJK0R1eE4pEFxgHzkUv0g_LH6cFI9s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
