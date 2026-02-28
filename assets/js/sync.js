/* ============================================
   CivicLearn Sync v1.0
   Drop-in sync for all CivicLearn sites.
   ============================================

   HOW IT WORKS:
   - On page load (after auth is confirmed), it PULLS
     the user's data from Supabase and merges it into
     localStorage (keeping the best version of each item).
   - Whenever the engine saves results, call
     CivicSync.push() to send the latest data to Supabase.
   - That's it. Device B loads the page → pulls → has
     everything Device A pushed.

   USAGE (in any page's HTML, after auth-guard):
     <script src="/assets/js/sync.js"></script>

   The script auto-runs on load. No extra setup needed.
   ============================================ */

(function () {
  "use strict";

  // ---- Configuration ----
  // These must exist on the page (set in your HTML <head>)
  // window.SUPABASE_URL  — your Supabase project URL
  // window.SUPABASE_KEY  — your publishable/anon key

  // The site code is determined from <html lang="...">
  // Override with window.CIVIC_SITE_CODE if needed
    function getSiteCode() {
    return window.CIVIC_SITE_CODE || "unknown";
  }

  // Which localStorage keys to sync
  var SYNC_KEYS = [
    "civicedge_stats",
    "civicedge_progress",
    "civicedge_saved",
    "dk_active_phase",
    "dk_phase2_unlocked",
    "dk_phase1_progress",
  ];

  // You can add site-specific keys by setting this before sync.js loads:
  //   window.CIVIC_SYNC_EXTRA_KEYS = ["my_custom_key"];

  function getAllSyncKeys() {
    var extra = window.CIVIC_SYNC_EXTRA_KEYS || [];
    return SYNC_KEYS.concat(extra);
  }

  // ---- Helpers ----

  function getEmail() {
    return (localStorage.getItem("cl_email") || "").toLowerCase().trim();
  }

 function getEndpoint() {
    return "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/sync";
}

  function readLS(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("[Sync] Failed to write localStorage key:", key, e);
    }
  }

  // ---- Merge Logic ----
  // Smart merging so no data is lost from either device

  function mergeProgress(local, remote) {
    // Both are objects: { "topic:questionText": { attempts, rights, wrongs, correct, ... } }
    var merged = Object.assign({}, remote || {});

    Object.keys(local || {}).forEach(function (key) {
      var l = local[key];
      var r = merged[key];

      if (!r) {
        // Only exists locally — keep it
        merged[key] = l;
        return;
      }

      // Both exist — keep the best of each field
      merged[key] = {
        attempts: Math.max(l.attempts || 0, r.attempts || 0),
        rights: Math.max(l.rights || 0, r.rights || 0),
        wrongs: Math.max(l.wrongs || 0, r.wrongs || 0),
        correct: l.correct === 1 || r.correct === 1 ? 1 : 0,
        topic: l.topic || r.topic,
        lastSeen: Math.max(l.lastSeen || 0, r.lastSeen || 0),
      };

      // Preserve _raw if present
      if (l._raw || r._raw) {
        merged[key]._raw = l._raw || r._raw;
      }
    });

    return merged;
  }

  function mergeStats(local, remote) {
    // Both are objects: { history: [ ...sessions ] }
    var localHist = (local && local.history) || [];
    var remoteHist = (remote && remote.history) || [];

    // Deduplicate by session ID
    var seen = {};
    var merged = [];

    remoteHist.concat(localHist).forEach(function (session) {
      var id = session.id || JSON.stringify(session.startedAt);
      if (!seen[id]) {
        seen[id] = true;
        merged.push(session);
      }
    });

    // Sort by startedAt (oldest first, matching engine behavior)
    merged.sort(function (a, b) {
      return (a.startedAt || 0) - (b.startedAt || 0);
    });

    return { history: merged };
  }

function mergeSaved(local, remote) {
  var merged = {};
  var allKeys = new Set(
    Object.keys(local || {}).concat(Object.keys(remote || {}))
  );
  allKeys.forEach(function (k) {
    var l = (local || {})[k];
    var r = (remote || {})[k];
    // Both exist: highest timestamp wins; false (removed) beats true but loses to a newer timestamp
    if (l === undefined || l === null) { merged[k] = r; return; }
    if (r === undefined || r === null) { merged[k] = l; return; }
    // Normalize: old `true` values treated as timestamp 1
    var lv = (l === true) ? 1 : (l || 0);
    var rv = (r === true) ? 1 : (r || 0);
    // false = 0, so a newer save timestamp always wins over a removal
    merged[k] = (lv >= rv) ? l : r;
  });
  return merged;
}

  function mergeKey(key, local, remote) {
    if (key === "civicedge_progress") {
      return mergeProgress(local, remote);
    }
    if (key === "civicedge_stats") {
      return mergeStats(local, remote);
    }
    if (key === "civicedge_saved") {
      return mergeSaved(local, remote);
    }

    // One-way unlock flags: true always wins (cannot re-lock)
    if (key === "dk_phase2_unlocked") {
      return (local === true || local === "true" || remote === true || remote === "true")
        ? true
        : (local !== null && local !== undefined ? local : remote);
    }

    // For simple keys (strings, booleans, etc.): prefer local if it exists
    return local !== null && local !== undefined ? local : remote;
  }

  // ---- API Calls ----

  function callSync(payload) {
    var endpoint = getEndpoint();
    var apikey = window.SUPABASE_KEY || "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apikey,
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) throw new Error("Sync HTTP " + res.status);
      return res.json();
    });
  }

  // ---- PULL (server → localStorage) ----

  function pull() {
    var email = getEmail();
    if (!email) return Promise.resolve();

    var site = getSiteCode();

    return callSync({ action: "pull", email: email, site: site })
      .then(function (result) {
        var rows = result.rows || [];
        if (!rows.length) {
          console.log("[Sync] No remote data found. First sync — will push local data.");
          // First time: push everything local to server
          return pushAll();
        }

        // Merge each key
        rows.forEach(function (row) {
          var remoteData = row.data;
          var localData = readLS(row.key);
          var merged = mergeKey(row.key, localData, remoteData);
          writeLS(row.key, merged);
        });

        console.log("[Sync] Pull complete. Merged", rows.length, "keys.");

        // After merging, push merged state back so server has the latest
        return pushAll().then(function () {
          // Reload once so dashboard picks up the synced data
          if (!sessionStorage.getItem("civicsync_loaded")) {
            sessionStorage.setItem("civicsync_loaded", "1");
            location.reload();
          }
        });
      })
      .catch(function (err) {
        // Fail silently — sync is best-effort, never blocks the app
        console.warn("[Sync] Pull failed (non-blocking):", err.message);
      });
  }

  // ---- PUSH (localStorage → server) ----

  function pushOne(key) {
    var email = getEmail();
    if (!email) return Promise.resolve();

    var site = getSiteCode();
    var data = readLS(key);

    // Don't push null/empty
    if (data === null || data === undefined) return Promise.resolve();

    return callSync({
      action: "push",
      email: email,
      site: site,
      key: key,
      data: data,
    }).catch(function (err) {
      console.warn("[Sync] Push failed for", key, "(non-blocking):", err.message);
    });
  }

  function pushAll() {
    var keys = getAllSyncKeys();
    var promises = keys.map(function (key) {
      return pushOne(key);
    });
    return Promise.all(promises).then(function () {
      console.log("[Sync] Push complete.");
    });
  }

  // ---- Public API ----

  window.CivicSync = {
    // Call after a test finishes or any important save.
    // Pass specific keys, or call with no args to push everything.
    push: function (keys) {
      if (!keys) return pushAll();
      if (typeof keys === "string") return pushOne(keys);
      return Promise.all(keys.map(pushOne)).then(function () {
        console.log("[Sync] Push complete.");
      });
    },

    // Manually trigger a full pull + merge (normally auto-runs on load)
    pull: pull,

    // Force full sync: pull then push
    fullSync: function () {
      return pull();
    },
  };

  // ---- Auto-run on page load ----
  // Wait for auth to be confirmed, then pull

  function autoSync() {
    // Only sync if user is authenticated
    if (localStorage.getItem("cl_auth") !== "ok") return;
    if (!getEmail()) return;
    if (!window.SUPABASE_URL) return;

    // Small delay to let auth-guard finish
    pull();
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(autoSync, 500);
    });
  } else {
    setTimeout(autoSync, 500);
  }
})();
