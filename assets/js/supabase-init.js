// /assets/js/supabase-init.js
// Create ONE global Supabase client used by every script (modules + inline)

// 🌟 FIX: Use the standard +esm suffix for a robust module import
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.86.2/+esm";

// Supabase project config
const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
const SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

// Attach client to the global window scope
window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);