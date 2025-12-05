// /assets/js/supabase-init.js
// Create ONE global Supabase client used by every script (modules + inline)

// 🌟 FIX: Use the stable Unpkg CDN path for deep module dependency resolution
import { createClient } from "https://unpkg.com/@supabase/supabase-js@2.86.2/dist/module/index.js";

// Supabase project config
const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
const SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

// Attach client to the global window scope
window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);