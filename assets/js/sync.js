/* ============================================
   CivicLearn Sync v1.2
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

   v1.1 changes:
   - Push only keys that actually changed during merge
   - Debounce push() calls (2s) — rapid saves collapse into one write
   - Skip push entirely if local data matches remote (no-op UPSERTs eliminated)

   v1.2 changes:
   - FIX: mergeSaved now uses "deletion wins" logic (Math.min).
     Previously used Math.max so an unsaved state on one device
     was always overwritten by a saved state from Supabase,
     making it impossible to permanently remove saved questions.
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

  // Stable JSON stringify for comparison (sorted keys)
  function stableStringify(obj) {
    try {
      if (obj === null || obj === undefined) return String(obj);
      if (typeof obj !== "object") return JSON.stringify(obj);
      if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
      var keys = Object.keys(obj).sort();
      return "{" + keys.map(function (k) {
        return JSON.stringify(k) + ":" + stableStringify(obj[k]);
      }).join(",") + "}";
    } catch (e) {
      return JSON.stringify(obj);
    }
  }

  function dataEqual(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  // ---- Merge Logic ----
  // Smart merging so no data is lost from either device

  function mergeProgress(local, remote) {
    var merged = Object.assign({}, remote || {});

    Object.keys(local || {}).forEach(function (key) {
      var l = local[key];
      var r = merged[key];

      if (!r) {
        merged[key] = l;
        return;
      }

      merged[key] = {
        attempts: Math.max(l.attempts || 0, r.attempts || 0),
        rights: Math.max(l.rights || 0, r.rights || 0),
        wrongs: Math.max(l.wrongs || 0, r.wrongs || 0),
        correct: l.correct === 1 || r.correct === 1 ? 1 : 0,
        topic: l.topic || r.topic,
        lastSeen: Math.max(l.lastSeen || 0, r.lastSeen || 0),
      };

      if (l._raw || r._raw) {
        merged[key]._raw = l._raw || r._raw;
      }
    });

    return merged;
  }

  function mergeStats(local, remote) {
    var localHist = (local && local.history) || [];
    var remoteHist = (remote && remote.history) || [];

    var seen = {};
    var merged = [];

    remoteHist.concat(localHist).forEach(function (session) {
      var id = session.id || JSON.stringify(session.startedAt);
      if (!seen[id]) {
        seen[id] = true;
        merged.push(session);
      }
    });

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
      if (l === undefined || l === null) { merged[k] = r; return; }
      if (r === undefined || r === null) { merged[k] = l; return; }
      var lv = (l === true) ? 1 : (l || 0);
      var rv = (r === true) ? 1 : (r || 0);
      // FIX v1.2: Use Math.min so "unsaved/removed" always wins over "saved".
      // Previously Math.max caused Supabase's saved=true to override local removals,
      // making it impossible to permanently delete questions from My List.
      merged[k] = (lv <= rv) ? l : r;
    });
    return merged;
  }

  function mergeKey(key, local, remote) {
    if (key === "civicedge_progress") return mergeProgress(local, remote);
    if (key === "civicedge_stats") return mergeStats(local, remote);
    if (key === "civicedge_saved") return mergeSaved(local, remote);

    if (key === "dk_phase2_unlocked") {
      return (local === true || local === "true" || remote === true || remote === "true")
        ? true
        : (local !== null && local !== undefined ? local : remote);
    }

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
          return pushAll();
        }

        // Two separate tracking sets:
        // - keysToWrite: merged result differs from local → update localStorage
        // - keysToPush:  merged result differs from remote → server is behind, push needed
        //
        // Critically, keysToPush catches the case where local was AHEAD of remote
        // (e.g. a push was missed because the user closed the tab during the debounce window).
        // In that case merged === local (local wins), so keysToWrite is empty,
        // but merged !== remote, so we still push to bring the server up to date.
        var keysToWrite = [];
        var keysToPush = [];
        var localDataSnapshot = {};

        rows.forEach(function (row) {
          var remoteData = row.data;
          var localData = readLS(row.key);
          var merged = mergeKey(row.key, localData, remoteData);

          localDataSnapshot[row.key] = localData;

          if (!dataEqual(localData, merged)) {
            writeLS(row.key, merged);
            keysToWrite.push(row.key);
          }

          if (!dataEqual(remoteData, merged)) {
            keysToPush.push(row.key);
          }
        });

        console.log("[Sync] Pull complete.", keysToWrite.length, "key(s) updated locally,", keysToPush.length, "key(s) to push.");

        if (keysToPush.length > 0) {
          return pushKeys(keysToPush).then(function () {
            // Only reload if local data actually changed (i.e. remote had something new)
            if (keysToWrite.length > 0 && !sessionStorage.getItem("civicsync_loaded")) {
              sessionStorage.setItem("civicsync_loaded", "1");
              location.reload();
            }
          });
        } else {
          console.log("[Sync] Server already up to date. No push needed.");
        }
      })
      .catch(function (err) {
        console.warn("[Sync] Pull failed (non-blocking):", err.message);
      });
  }

  // ---- PUSH (localStorage → server) ----

  function pushOne(key) {
    var email = getEmail();
    if (!email) return Promise.resolve();

    var site = getSiteCode();
    var data = readLS(key);

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

  function pushKeys(keys) {
    return Promise.all(keys.map(function (key) {
      return pushOne(key);
    })).then(function () {
      console.log("[Sync] Pushed", keys.length, "key(s).");
    });
  }

  function pushAll() {
    return pushKeys(getAllSyncKeys()).then(function () {
      console.log("[Sync] Push complete.");
    });
  }

  // ---- Debounced Push ----
  // Collapses rapid-fire push() calls (e.g. answering multiple questions quickly)
  // into a single write after DEBOUNCE_MS of inactivity.

  var DEBOUNCE_MS = 2000;
  var _debounceTimer = null;
  var _pendingKeys = {};

  function schedulePush(keys) {
    keys.forEach(function (k) { _pendingKeys[k] = true; });

    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      var toFlush = Object.keys(_pendingKeys);
      _pendingKeys = {};
      if (toFlush.length > 0) {
        pushKeys(toFlush);
      }
    }, DEBOUNCE_MS);
  }

  // ---- Public API ----

  window.CivicSync = {
    // Call after a test finishes or any important save.
    // Pass specific keys, or call with no args to push everything.
    // Calls are debounced — rapid saves collapse into one write.
    push: function (keys) {
      var toSync;
      if (!keys) {
        toSync = getAllSyncKeys();
      } else if (typeof keys === "string") {
        toSync = [keys];
      } else {
        toSync = keys;
      }
      schedulePush(toSync);
    },

    // Manually trigger a full pull + merge (normally auto-runs on load)
    pull: pull,

    // Force full sync: pull then push
    fullSync: function () {
      return pull();
    },
  };

  // ---- Auto-run on page load ----

  function autoSync() {
    if (localStorage.getItem("cl_auth") !== "ok") return;
    if (!getEmail()) return;
    if (!window.SUPABASE_URL) return;

    pull();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(autoSync, 500);
    });
  } else {
    setTimeout(autoSync, 500);
  }
})();
