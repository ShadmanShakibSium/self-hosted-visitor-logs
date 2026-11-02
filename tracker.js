/*
 * tracker.js
 * Usage (put at the end of each page, before </body>):
 *   <script src="tracker.js" data-site="#" defer></script>
 * data-site = the name that appears as a tab in your dashboard.
 */
(function () {
  "use strict";

  var S = document.currentScript || document.querySelector("script[data-site]");
  var SITE = (S && S.getAttribute("data-site")) || location.hostname;

  var CFG = {
    apiKey: "AIzaSyDASut3M99bMgmQK_V4Xk12zyMGMPMArcM",
    authDomain: "logweb-27703.firebaseapp.com",
    projectId: "logweb-27703",
    storageBucket: "logweb-27703.firebasestorage.app",
    messagingSenderId: "430930872770",
    appId: "1:430930872770:web:3a709d412daab76a79ae5b"
  };
  var FB = "https://www.gstatic.com/firebasejs/10.14.1/";
  var DEFAULT_MSG = "You have been blocked from viewing this website.";

  var blocked = false;

  /* ---------- media tracking ----------
     Catches <audio>/<video> in the page AND elements created with new Audio()
     (those are never in the DOM, so querySelectorAll can't see them). */
  var MEDIA = [];
  function trackMedia(m) { if (MEDIA.indexOf(m) < 0) MEDIA.push(m); }
  try {
    var origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      trackMedia(this);
      return origPlay.apply(this, arguments);
    };
  } catch (e) {}
  function mediaPlaying() {
    try {
      var els = document.querySelectorAll("audio,video");
      for (var i = 0; i < els.length; i++) trackMedia(els[i]);
    } catch (e) {}
    for (var j = 0; j < MEDIA.length; j++) {
      var m = MEDIA[j];
      if (!m.paused && !m.ended) return true;
    }
    return false;
  }

  function LS(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  /* ---------- device label (e.g. "Chrome on Android (Pixel 7)") ---------- */
  function label() {
    var u = navigator.userAgent, os = "Unknown OS", m;
    if ((m = u.match(/Android [\d.]+; ([^;)]+)/))) os = "Android (" + m[1].replace(/ Build.*/, "").trim() + ")";
    else if (/iPhone/.test(u)) os = "iPhone";
    else if (/iPad/.test(u)) os = "iPad";
    else if (/Windows/.test(u)) os = "Windows";
    else if (/Mac OS X/.test(u)) os = "macOS";
    else if (/CrOS/.test(u)) os = "ChromeOS";
    else if (/Linux/.test(u)) os = "Linux";
    var br = /Edg\//.test(u) ? "Edge"
      : /OPR\/|Opera/.test(u) ? "Opera"
      : /Firefox|FxiOS/.test(u) ? "Firefox"
      : /SamsungBrowser/.test(u) ? "Samsung Internet"
      : /Chrome|CriOS/.test(u) ? "Chrome"
      : /Safari/.test(u) ? "Safari" : "Browser";
    return br + " on " + os;
  }

  /* ---------- IP + location ---------- */
  async function getIP() {
    try {
      var c = sessionStorage.getItem("_lg_ip");
      if (c) return JSON.parse(c);
    } catch (e) {}
    var out = {};
    async function get(url) {
      var ac = new AbortController();
      var t = setTimeout(function () { ac.abort(); }, 4000);
      try {
        var r = await fetch(url, { signal: ac.signal });
        return await r.json();
      } finally { clearTimeout(t); }
    }
    try {
      var j = await get("https://ipwho.is/");
      if (j && j.ip) out = { ip: j.ip, city: j.city || "", country: j.country || "" };
    } catch (e) {}
    if (!out.ip) {
      try {
        var k = await get("https://api.ipify.org?format=json");
        if (k && k.ip) out = { ip: k.ip };
      } catch (e) {}
    }
    try { sessionStorage.setItem("_lg_ip", JSON.stringify(out)); } catch (e) {}
    return out;
  }

  /* ---------- "Access blocked" screen (own CSS; shows custom message if given) ---------- */
  function block(msg) {
    var text = (msg && String(msg).trim()) || DEFAULT_MSG;
    if (blocked) {
      var p0 = document.querySelector("#__lg_block p");
      if (p0) p0.textContent = text;
      return;
    }
    blocked = true;
    var st = document.createElement("style");
    st.id = "__lg_block_css";
    st.textContent =
      "body>*:not(#__lg_block){display:none!important}" +
      "#__lg_block{position:fixed;inset:0;z-index:2147483647;background:#0d0f17;color:#eceef6;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;" +
      "font:16px/1.5 system-ui,-apple-system,sans-serif;text-align:center;padding:24px}" +
      "#__lg_block svg{width:72px;height:72px;color:#ff6b70}" +
      "#__lg_block h1{margin:0;font-size:28px;font-weight:700}" +
      "#__lg_block p{margin:0;color:#9097ad;max-width:420px;white-space:pre-wrap;word-break:break-word}";
    var d = document.createElement("div");
    d.id = "__lg_block";
    d.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>' +
      "<h1>Access blocked</h1><p></p>";
    d.querySelector("p").textContent = text;
    document.head.appendChild(st);
    document.body.appendChild(d);
    document.documentElement.style.overflow = "hidden";
  }

  function unblock() {
    if (!blocked) return;
    blocked = false;
    var d = document.getElementById("__lg_block");
    var st = document.getElementById("__lg_block_css");
    if (d) d.remove();
    if (st) st.remove();
    document.documentElement.style.overflow = "";
  }

  /* ---------- main ---------- */
  (async function () {
    try {
      var mods = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js")]);
      var initializeApp = mods[0].initializeApp, f = mods[1];
      var db = f.getFirestore(initializeApp(CFG, "lgt"));

      /* stable device id (per site name) */
      var uid = LS("_lg_uid");
      if (!uid) {
        uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        LS("_lg_uid", uid);
      }
      var slug = SITE.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "site";
      var id = slug + "_" + uid;

      async function getBan(key) {
        try {
          var s = await f.getDoc(f.doc(db, "bans", key));
          if (s.exists()) return { msg: s.data().msg || "" };
        } catch (e) {}
        return null;
      }
      var ipKey = function (ip) { return "ip_" + String(ip).replace(/[.:]/g, "_"); };

      /* 1) ban check + live ban listeners */
      var ipP = getIP();
      var bansNow = {}, got = {}, need = 0, registered = false, kIp = null;

      function applyBan() {
        var any = (id in bansNow) || (kIp && (kIp in bansNow));
        if (any) block(bansNow[id] || (kIp && bansNow[kIp]) || "");
        else {
          unblock();
          if (!registered) location.reload();
        }
      }
      function watch(key) {
        need++;
        f.onSnapshot(f.doc(db, "bans", key), function (s) {
          got[key] = 1;
          if (s.exists()) bansNow[key] = s.data().msg || "";
          else delete bansNow[key];
          if (Object.keys(got).length >= need) applyBan();
        }, function () {});
      }
      function startBlocked(msg) {
        block(msg);
        watch(id);
        if (kIp) watch(kIp);
      }

      var bn = await getBan(id);
      if (bn) {
        var i0 = await ipP;
        kIp = i0.ip ? ipKey(i0.ip) : null;
        startBlocked(bn.msg);
        return;
      }
      var ipi = await ipP;
      kIp = ipi.ip ? ipKey(ipi.ip) : null;
      if (kIp) {
        bn = await getBan(kIp);
        if (bn) { startBlocked(bn.msg); return; }
      }

      /* 2) device record */
      var dref = f.doc(db, "devices", id);
      var info = {};
      if (ipi.ip) info.ip = ipi.ip;
      if (ipi.city) info.city = ipi.city;
      if (ipi.country) info.country = ipi.country;

      var regKey = "_lg_reg_" + id, done = false;
      if (LS(regKey)) {
        try {
          await f.updateDoc(dref, Object.assign({ lastSeen: f.serverTimestamp(), visits: f.increment(1) }, info));
          done = true;
        } catch (e) {}
      }
      if (!done) {
        await f.setDoc(dref, Object.assign({
          site: SITE,
          ua: navigator.userAgent,
          device: label(),
          firstSeen: f.serverTimestamp(),
          lastSeen: f.serverTimestamp(),
          visits: 1,
          totalTime: 0,
          trashed: false
        }, info));
        LS(regKey, "1");
      }

      /* 3) this visit's log */
      var lref = f.doc(f.collection(db, "devices", id, "logs"));
      await f.setDoc(lref, {
        ts: f.serverTimestamp(),
        duration: 0,
        page: location.hostname + location.pathname + location.search,
        trashed: false
      });

      /* 4) time on page
         counts while the tab is visible, OR while audio/video is playing
         (so minimizing / switching apps during playback still counts) */
      var active = 0, sent = 0, lastTick = Date.now();

      function isActive() {
        return document.visibilityState === "visible" || mediaPlaying();
      }
      var wasActive = isActive();
      /* instant online/offline signal for the dashboard */
      function setOnline(v) {
        var p = { online: v };
        if (v) p.lastSeen = f.serverTimestamp();
        try { f.updateDoc(dref, p).catch(function () {}); } catch (e) {}
      }

      setInterval(function () {
        var now = Date.now();
        /* real elapsed seconds (browsers slow timers in background tabs);
           capped so a sleeping device doesn't add huge jumps */
        var gap = Math.min((now - lastTick) / 1000, 65);
        lastTick = now;
        if (blocked) return;
        var act = isActive();
        if (act) active += gap;
        if (act !== wasActive) { wasActive = act; setOnline(act); }
      }, 1000);

      async function flush() {
        var cur = Math.round(active), delta = cur - sent;
        if (delta <= 0 || blocked) return;
        sent = cur;
        try {
          await Promise.all([
            f.updateDoc(lref, { duration: cur }),
            f.updateDoc(dref, { totalTime: f.increment(delta), lastSeen: f.serverTimestamp() })
          ]);
        } catch (e) { sent -= delta; }
      }
      setInterval(flush, 20000);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") flush();
        var act = isActive();
        if (act !== wasActive) { wasActive = act; setOnline(act); }
      });
      addEventListener("pagehide", function () { flush(); setOnline(false); });

      /* 5) registered: start live ban listeners */
      registered = true;
      setOnline(true);
      watch(id);
      if (kIp) watch(kIp);
    } catch (e) {
      /* never break the main website */
    }
  })();
})();
