// Remove the import statement entirely.
// This script will now be loaded with a classic <script> tag.

// Load the Supabase client using the UMD (Universal Module Definition) build
// which places the 'supabase' object globally.
// The createClient function will be accessible as 'supabase.createClient'.

const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
const SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

// The UMD build makes the client available via window.supabase, but 
// we'll explicitly call the creation function and assign it to window.supabase
// for consistency with the rest of your code.
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);