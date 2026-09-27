/* Uplitycs tracker — no deps. Built by scripts/build-tracker.mjs */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var id = s.getAttribute("data-site");
  if (!id) return;
  var endpoint = new URL("/api/collect", s.src).href;
  var q = [];
  var timer = null;

  function rid() {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return Math.random().toString(36).slice(2);
    }
  }

  function slot(store, key) {
    try {
      if (!store[key]) store[key] = rid();
      return store[key];
    } catch (e) {
      return rid();
    }
  }

  var vid = slot(localStorage, "upl_vid");
  var sid = slot(sessionStorage, "upl_sid");

  function client() {
    var ua = navigator.userAgent || "";
    var width = screen.width || 0;
    var browser = /edg\//i.test(ua)
      ? "edge"
      : /opr\/|opera/i.test(ua)
        ? "opera"
        : /chrome|crios/i.test(ua)
          ? "chrome"
          : /firefox|fxios/i.test(ua)
            ? "firefox"
            : /safari/i.test(ua) && !/android/i.test(ua)
              ? "safari"
              : "other";
    var os = /windows/i.test(ua)
      ? "windows"
      : /android/i.test(ua)
        ? "android"
        : /iphone|ipad|ipod/i.test(ua)
          ? "ios"
          : /mac os/i.test(ua)
            ? "macos"
            : /linux/i.test(ua)
              ? "linux"
              : "other";
    return [width < 768 ? "m" : width < 1024 ? "t" : "d", browser, os, width, screen.height || 0];
  }

  function flush(beacon) {
    if (!q.length) return;
    var body = JSON.stringify({ siteId: id, events: q.splice(0) });
    if (beacon && navigator.sendBeacon) navigator.sendBeacon(endpoint, body);
    else
      fetch(endpoint, {
        method: "POST",
        body: body,
        keepalive: true,
        credentials: "omit",
      }).catch(function () {});
  }

  function push(event) {
    q.push(event);
    if (q.length >= 50) {
      flush(false);
      return;
    }
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      flush(false);
    }, 10000);
  }

  function event(name, props) {
    var info = client();
    var row = {
      ts: Date.now(),
      path: location.pathname + location.search,
      ref: document.referrer || "",
      vid: vid,
      sid: sid,
      d: info[0],
      b: info[1],
      os: info[2],
      sw: info[3],
      sh: info[4],
    };
    if (name) row.n = name;
    if (props) row.props = props;
    return row;
  }

  function pageview() {
    var row = event();
    var params = new URLSearchParams(location.search);
    var utm = {};
    var keys = ["source", "medium", "campaign"];
    var i;
    var any = 0;
    for (i = 0; i < keys.length; i++) {
      var value = params.get("utm_" + keys[i]);
      if (value) {
        utm[keys[i]] = value;
        any = 1;
      }
    }
    if (any) row.utm = utm;
    push(row);
  }

  function hide() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    flush(true);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });
  addEventListener("pagehide", hide);

  var pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(this, arguments);
    pageview();
  };
  addEventListener("popstate", pageview);

  window.uplitycs = {
    track: function (name, props) {
      if (!name) return;
      push(event(name, props && typeof props === "object" ? props : null));
    },
  };
  pageview();
})();
