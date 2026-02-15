// =============================================================================
// YKI Finnish — Cloud Hydration
// Syncs async evaluation results (writing/speaking) from Supabase back to localStorage
// =============================================================================

(function () {
  const SUPABASE_URL = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';

  async function hydrateFromCloud() {
    const email = localStorage.getItem('cl_email');
    if (!email) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/yki-finnish-hydrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ email })
      });

      if (!res.ok) return;
      const { attempts } = await res.json();
      if (!attempts || attempts.length === 0) return;

      let updated = false;

      attempts.forEach(a => {
        const key = `yki_test_${a.exam_id}`;
        const local = JSON.parse(localStorage.getItem(key) || 'null');
        if (!local) return;

        // Merge cloud writing score if locally missing
        if (a.writing_score !== null && local.sections.writing.score !== a.writing_score) {
          local.sections.writing.score = a.writing_score;
          updated = true;
        }
        // Merge cloud speaking score if locally missing
        if (a.speaking_score !== null && local.sections.speaking.score !== a.speaking_score) {
          local.sections.speaking.score = a.speaking_score;
          updated = true;
        }
        // Store result_id if missing
        if (a.id && !local.result_id) {
          local.result_id = a.id;
          local.submitted = true;
          updated = true;
        }

        if (updated) localStorage.setItem(key, JSON.stringify(local));
      });

      // Re-render dashboard if scores were updated
      if (updated && typeof generateTestsTable === 'function') {
        generateTestsTable();
        updateStatsCards();
      }
    } catch (e) {
      console.warn('Hydrate failed (non-blocking):', e);
    }
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', hydrateFromCloud);
})();
