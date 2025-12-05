// /assets/js/supabase-init.js

const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
const SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

// CRITICAL FIX: The UMD script (loaded via the <script src="..."> tag)
// makes the object accessible globally via the bare name 'supabase'.

// 🌟 FIX: Call the function directly from the global 'supabase' object.
const supabaseClientInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Now, assign the actual client instance back to the window.
// This overwrites the temporary object created by the UMD script.
window.supabase = supabaseClientInstance;