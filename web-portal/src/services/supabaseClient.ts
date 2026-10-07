import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://fqgujgwdgqlxnpmpmiui.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZ3VqZ3dkZ3FseG5wbXBtaXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjk0NTgsImV4cCI6MjEwNjgwNTQ1OH0._OvkzhPn_FTlhVZeZuZwmDI_TvgfHt__yTtijK4vgJc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
