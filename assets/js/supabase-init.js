// /assets/js/supabase-init.js

const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
const SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

// CRITICAL FIX: The UMD script first creates the 'supabase' object globally.
// The createClient function is available ON that object.
// We must call it and then OVERWRITE the global object with the *actual client instance*.

const supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabase = supabaseClientInstance;