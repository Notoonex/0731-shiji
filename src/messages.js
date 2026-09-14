/* =============================================================================
   时光 · 群消息时间线视图 messages.js
   外层统一调用 initMessages()，本文件不自动执行。
   ============================================================================= */

function initMessages() {
  'use strict';

  var root = document.getElementById('ms-root');
  if (!root || root.dataset.msReady === '1') { return; }
  root.dataset.msReady = '1';

  var $ = function (sel, scope) { return (scope || root).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || root).querySelectorAll(sel)); };

  var scroller = $('#ms-scroll');
  var stream = $('#ms-stream');
  var toastEl = $('#ms-toast');
  var days = $$('.ms-day', stream);

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(reduceMQ && reduceMQ.matches); }

  var MONTH_MAX = 96;          /* 2017年9月 → 2025年9月，共 96 个月 */
  var toastTimer = 0;

  function toast(text) {
    if (!toastEl) { return; }
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  function monthLabel(m) {
    var total = 8 + Math.max(0, Math.min(MONTH_MAX, Math.round(m)));   /* 2017年9月 = 第 8 个月 */
    var y = 2017 + Math.floor(total / 12);
    var mo = (total % 12) + 1;
    return y + '年' + mo + '月';
  }

  function fmtClock(sec) {
    var s = Math.max(0, Math.round(sec));
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  /* ===========================================================================
     1 · 语音波形：按消息 id 派生的伪随机序列，保证每次渲染都一样
     =========================================================================== */

  function seedRand(seed) {
    var s = 2166136261;
    for (var i = 0; i < seed.length; i++) {
      s = Math.imul(s ^ seed.charCodeAt(i), 16777619);
    }
    return function () {
      s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
      return s / 4294967296;
    };
  }

  var clipSeq = 0;

  function buildWave(voice) {
    var svg = voice.querySelector('.ms-wave');
    if (!svg) { return; }
    var dur = parseFloat(voice.getAttribute('data-dur')) || 12;
    var seed = voice.getAttribute('data-seed') || ('v' + (clipSeq + 1));
    var rand = seedRand(seed);
    var n = Math.max(20, Math.min(76, Math.round(dur * 2.2)));
    var step = 300 / n;
    var barW = Math.max(1.6, step * 0.52);

    var base = svg.querySelector('.ms-wave__base');
    var fill = svg.querySelector('.ms-wave__fill');
    var clip = svg.querySelector('.ms-wave__clip');
    if (!base || !fill || !clip) { return; }

    clipSeq += 1;
    var cid = 'ms-clip-' + clipSeq;
    clip.setAttribute('id', cid);
    fill.setAttribute('clip-path', 'url(#' + cid + ')');

    var NS = 'http://www.w3.org/2000/svg';
    var frag1 = document.createDocumentFragment();
    var frag2 = document.createDocumentFragment();

    for (var i = 0; i < n; i++) {
      var env = Math.pow(Math.sin(Math.PI * (i + 0.5) / n), 0.35);
      var a = 0.16 + 0.84 * env * (0.3 + 0.7 * rand());
      var h = Math.max(3, a * 36);
      var y = (40 - h) / 2;
      var x = i * step + (step - barW) / 2;
      var r1 = document.createElementNS(NS, 'rect');
      r1.setAttribute('x', x.toFixed(2));
      r1.setAttribute('y', y.toFixed(2));
      r1.setAttribute('width', barW.toFixed(2));
      r1.setAttribute('height', h.toFixed(2));
      r1.setAttribute('rx', '1');
      frag1.appendChild(r1);
      frag2.appendChild(r1.cloneNode(false));
    }
    base.textContent = '';
    fill.textContent = '';
    base.appendChild(frag1);
    fill.appendChild(frag2);

    voice.__clipRect = clip.querySelector('rect');
    voice.__dur = dur;
    voice.__pos = 0;
  }

  /* ===========================================================================
     2 · 语音播放模拟
     =========================================================================== */

  var playingVoice = null;
  var voiceRAF = 0;

  function paintVoice(voice) {
    var p = voice.__dur ? Math.max(0, Math.min(1, voice.__pos / voice.__dur)) : 0;
    if (voice.__clipRect) { voice.__clipRect.setAttribute('width', (300 * p).toFixed(2)); }
    var d = voice.querySelector('.ms-voice__d');
    if (d) {
      d.textContent = voice.__pos > 0 && voice.__pos < voice.__dur
        ? fmtClock(voice.__dur - voice.__pos)
        : fmtClock(voice.__dur);
    }
  }

  function stopVoice(voice, rewind) {
    if (!voice) { return; }
    voice.classList.remove('is-playing');
    var btn = voice.querySelector('.ms-voice__btn');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', '播放语音'); }
    if (rewind) { voice.__pos = 0; }
    paintVoice(voice);
    if (playingVoice === voice) {
      playingVoice = null;
      window.cancelAnimationFrame(voiceRAF);
    }
  }

  function tickVoice(now) {
    var v = playingVoice;
    if (!v) { return; }
    var dt = (now - v.__last) / 1000;
    v.__last = now;
    v.__pos += dt;
    if (v.__pos >= v.__dur) { v.__pos = v.__dur; paintVoice(v); stopVoice(v, true); return; }
    paintVoice(v);
    voiceRAF = window.requestAnimationFrame(tickVoice);
  }

  function playVoice(voice) {
    if (playingVoice && playingVoice !== voice) { stopVoice(playingVoice, true); }
    stopVideo(playingVideo, true);
    if (voice.__pos >= voice.__dur) { voice.__pos = 0; }
    voice.classList.add('is-playing');
    var btn = voice.querySelector('.ms-voice__btn');
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', '暂停语音'); }
    playingVoice = voice;
    voice.__last = window.performance ? performance.now() : Date.now();
    window.cancelAnimationFrame(voiceRAF);
    voiceRAF = window.requestAnimationFrame(tickVoice);
  }

  $$('.ms-voice').forEach(function (voice) {
    buildWave(voice);
    paintVoice(voice);

    var btn = voice.querySelector('.ms-voice__btn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (voice.classList.contains('is-playing')) { stopVoice(voice, false); }
        else { playVoice(voice); }
      });
    }
    var wave = voice.querySelector('.ms-wave');
    if (wave) {
      wave.addEventListener('click', function (e) {
        var r = wave.getBoundingClientRect();
        if (!r.width) { return; }
        voice.__pos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * voice.__dur;
        paintVoice(voice);
        if (!voice.classList.contains('is-playing')) { playVoice(voice); }
        else { voice.__last = window.performance ? performance.now() : Date.now(); }
      });
    }
  });

  /* ===========================================================================
     3 · 视频播放模拟
     =========================================================================== */

  var playingVideo = null;
  var videoRAF = 0;

  function paintVideo(box) {
    var p = box.__dur ? Math.max(0, Math.min(1, box.__pos / box.__dur)) : 0;
    var fill = box.querySelector('.ms-video__fill');
    if (fill) { fill.style.width = (p * 100).toFixed(2) + '%'; }
    var pill = box.querySelector('.ms-video__pill');
    if (pill) {
      pill.textContent = box.__pos > 0 && box.__pos < box.__dur
        ? fmtClock(box.__pos) + ' / ' + fmtClock(box.__dur)
        : fmtClock(box.__dur);
    }
  }

  function stopVideo(box, rewind) {
    if (!box) { return; }
    box.classList.remove('is-playing');
    var btn = box.querySelector('.ms-video__play');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', '播放视频'); }
    if (rewind) { box.__pos = 0; }
    paintVideo(box);
    if (playingVideo === box) {
      playingVideo = null;
      window.cancelAnimationFrame(videoRAF);
    }
  }

  function tickVideo(now) {
    var b = playingVideo;
    if (!b) { return; }
    var dt = (now - b.__last) / 1000;
    b.__last = now;
    b.__pos += dt;
    if (b.__pos >= b.__dur) { b.__pos = b.__dur; paintVideo(b); stopVideo(b, true); return; }
    paintVideo(b);
    videoRAF = window.requestAnimationFrame(tickVideo);
  }

  $$('.ms-video').forEach(function (box) {
    box.__dur = parseFloat(box.getAttribute('data-dur')) || 30;
    box.__pos = 0;
    paintVideo(box);
    var btn = box.querySelector('.ms-video__play');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      if (box.classList.contains('is-playing')) { stopVideo(box, false); return; }
      if (playingVideo && playingVideo !== box) { stopVideo(playingVideo, true); }
      stopVoice(playingVoice, true);
      box.classList.add('is-playing');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', '暂停视频');
      playingVideo = box;
      box.__last = window.performance ? performance.now() : Date.now();
      window.cancelAnimationFrame(videoRAF);
      videoRAF = window.requestAnimationFrame(tickVideo);
    });
  });

  /* ===========================================================================
     4 · 日期吸顶 + 时间轴滑块联动
     =========================================================================== */

  var scrub = $('#ms-scrub');
  var track = $('#ms-scrub-track');
  var thumb = $('#ms-scrub-thumb');
  var fill = $('#ms-scrub-fill');
  var bubble = $('#ms-scrub-bubble');
  var ticks = $$('.ms-tick');
  var dragging = false;

  function setScrub(month) {
    var m = Math.max(0, Math.min(MONTH_MAX, month));
    var p = m / MONTH_MAX;
    if (thumb) {
      thumb.style.left = (p * 100).toFixed(3) + '%';
      thumb.setAttribute('aria-valuenow', String(Math.round(m)));
      thumb.setAttribute('aria-valuetext', monthLabel(m));
    }
    if (fill) { fill.style.width = (p * 100).toFixed(3) + '%'; }
    if (bubble) {
      bubble.style.left = (p * 100).toFixed(3) + '%';
      bubble.textContent = monthLabel(m);
    }
  }

  function dayMonth(day) { return parseFloat(day.getAttribute('data-month')) || 0; }

  function nearestDay(month) {
    var best = null;
    var bestD = Infinity;
    days.forEach(function (d) {
      var diff = Math.abs(dayMonth(d) - month);
      if (diff < bestD) { bestD = diff; best = d; }
    });
    return best;
  }

  function gotoDay(day, quiet) {
    if (!day || !scroller) { return; }
    var top = day.offsetTop - 8;
    scroller.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
    if (!quiet) { toast('跳到 ' + day.getAttribute('data-label')); }
  }

  function syncTicks(month) {
    var y = 2017 + Math.floor((8 + month) / 12);
    ticks.forEach(function (t) {
      t.classList.toggle('is-on', parseInt(t.getAttribute('data-year'), 10) === y);
    });
  }

  var scrollRAF = false;
  function onScroll() {
    if (scrollRAF) { return; }
    scrollRAF = true;
    window.requestAnimationFrame(function () {
      scrollRAF = false;
      if (!scroller) { return; }
      var top = scroller.scrollTop;
      var cur = days[0];
      days.forEach(function (d) {
        if (d.offsetTop - 24 <= top) { cur = d; }
        var head = d.querySelector('.ms-day__head');
        if (head) {
          var inside = top > d.offsetTop - 4 && top < d.offsetTop + d.offsetHeight - 120;
          head.classList.toggle('is-stuck', inside);
        }
      });
      if (!dragging && cur) {
        /* 在当前日期与下一个日期之间做线性插值，滑块随滚动连续移动 */
        var idx = days.indexOf(cur);
        var m = dayMonth(cur);
        var next = days[idx + 1];
        if (next) {
          var span = Math.max(1, next.offsetTop - cur.offsetTop);
          var t = Math.max(0, Math.min(1, (top - cur.offsetTop) / span));
          /* 只在接近下一天时才开始过渡，否则读着 2019 年的内容滑块却指向 2020 */
          t = Math.max(0, (t - 0.72) / 0.28);
          m = m + (dayMonth(next) - m) * t;
        }
        setScrub(m);
        syncTicks(Math.round(m));
      }
    });
  }

  if (scroller) { scroller.addEventListener('scroll', onScroll, { passive: true }); }

  function monthFromEvent(e) {
    if (!track) { return 0; }
    var r = track.getBoundingClientRect();
    if (!r.width) { return 0; }
    var x = (e.clientX - r.left) / r.width;
    return Math.max(0, Math.min(1, x)) * MONTH_MAX;
  }

  function startDrag(e) {
    dragging = true;
    scrub.classList.add('is-dragging');
    var m = monthFromEvent(e);
    setScrub(m);
    syncTicks(Math.round(m));
    if (track.setPointerCapture && e.pointerId !== undefined) {
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    }
  }
  function moveDrag(e) {
    if (!dragging) { return; }
    var m = monthFromEvent(e);
    setScrub(m);
    syncTicks(Math.round(m));
  }
  function endDrag(e) {
    if (!dragging) { return; }
    dragging = false;
    scrub.classList.remove('is-dragging');
    var m = monthFromEvent(e);
    var day = nearestDay(m);
    if (day) {
      var exact = Math.abs(dayMonth(day) - m) < 1.2;
      gotoDay(day, exact);
      if (!exact) { toast(monthLabel(m) + ' 没有已导入的内容，跳到最近的 ' + day.getAttribute('data-label')); }
    }
  }

  if (track) {
    track.addEventListener('pointerdown', startDrag);
    track.addEventListener('pointermove', moveDrag);
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', function () { dragging = false; scrub.classList.remove('is-dragging'); });
  }
  if (thumb) {
    thumb.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 12 : 1;
      var now = parseFloat(thumb.getAttribute('aria-valuenow')) || 0;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setScrub(now - step); syncTicks(now - step); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setScrub(now + step); syncTicks(now + step); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var m = parseFloat(thumb.getAttribute('aria-valuenow')) || 0;
        gotoDay(nearestDay(m));
      }
    });
  }

  ticks.forEach(function (t) {
    t.addEventListener('click', function () {
      var y = parseInt(t.getAttribute('data-year'), 10);
      var hit = null;
      days.forEach(function (d) {
        if (parseInt(d.getAttribute('data-date').slice(0, 4), 10) === y && !hit) { hit = d; }
      });
      if (hit) { gotoDay(hit); return; }
      toast(y + ' 年这个群比较安静，还没有内容被整理出来');
    });
  });

  setScrub(0);
  window.setTimeout(onScroll, 60);

  /* ===========================================================================
     5 · 群内搜索
     =========================================================================== */

  var searchIn = $('#ms-search');
  var countEl = $('#ms-search-count');
  var prevBtn = $('#ms-search-prev');
  var nextBtn = $('#ms-search-next');
  var TEXT_SEL = '.ms-txt, .ms-cap, .ms-tr__t, .ms-quote__t, .ms-file__n, .ms-link__t, .ms-link__d, .ms-loc__n, .ms-loc__a, .ms-money__t, .ms-money__m, .ms-sys__t, .ms-revoked, .ms-echo__row';
  var totalMsgs = $$('.ms-msg', stream).length + $$('.ms-sys', stream).length;
  var hits = [];
  var hitIndex = -1;

  if (countEl) { countEl.textContent = '已载入 ' + totalMsgs + ' 条'; }

  function clearMarks() {
    $$('.ms-hit', stream).forEach(function (m) {
      var parent = m.parentNode;
      if (!parent) { return; }
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    hits = [];
    hitIndex = -1;
  }

  function markIn(el, needle) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) { nodes.push(node); }
    nodes.forEach(function (tn) {
      var text = tn.nodeValue;
      var lower = text.toLowerCase();
      var at = lower.indexOf(needle);
      if (at < 0) { return; }
      var frag = document.createDocumentFragment();
      var cursor = 0;
      while (at >= 0) {
        if (at > cursor) { frag.appendChild(document.createTextNode(text.slice(cursor, at))); }
        var mark = document.createElement('mark');
        mark.className = 'ms-hit';
        mark.textContent = text.slice(at, at + needle.length);
        frag.appendChild(mark);
        hits.push(mark);
        cursor = at + needle.length;
        at = lower.indexOf(needle, cursor);
      }
      if (cursor < text.length) { frag.appendChild(document.createTextNode(text.slice(cursor))); }
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  function focusHit(i) {
    if (!hits.length) { return; }
    hitIndex = (i + hits.length) % hits.length;
    hits.forEach(function (h) { h.classList.remove('is-current'); });
    var cur = hits[hitIndex];
    cur.classList.add('is-current');
    var host = cur.closest ? cur.closest('.ms-msg, .ms-sys') : null;
    if (host && host.scrollIntoView) {
      host.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    }
    if (countEl) { countEl.textContent = (hitIndex + 1) + ' / ' + hits.length + ' 条匹配'; }
  }

  function runSearch(raw) {
    clearMarks();
    var needle = String(raw || '').trim().toLowerCase();
    if (!needle) {
      if (countEl) { countEl.textContent = '已载入 ' + totalMsgs + ' 条'; }
      if (prevBtn) { prevBtn.setAttribute('aria-disabled', 'true'); }
      if (nextBtn) { nextBtn.setAttribute('aria-disabled', 'true'); }
      return;
    }
    $$(TEXT_SEL, stream).forEach(function (el) { markIn(el, needle); });
    var has = hits.length > 0;
    if (prevBtn) { prevBtn.setAttribute('aria-disabled', has ? 'false' : 'true'); }
    if (nextBtn) { nextBtn.setAttribute('aria-disabled', has ? 'false' : 'true'); }
    if (!has) {
      if (countEl) { countEl.textContent = '没有匹配「' + raw.trim() + '」'; }
      return;
    }
    focusHit(0);
  }

  if (searchIn) {
    searchIn.addEventListener('input', function () { runSearch(searchIn.value); });
    searchIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); focusHit(hitIndex + (e.shiftKey ? -1 : 1)); }
      else if (e.key === 'Escape') { e.preventDefault(); searchIn.value = ''; runSearch(''); }
    });
  }
  if (nextBtn) { nextBtn.addEventListener('click', function () { focusHit(hitIndex + 1); }); }
  if (prevBtn) { prevBtn.addEventListener('click', function () { focusHit(hitIndex - 1); }); }

  /* ===========================================================================
     6 · 右栏：面板切换与上下文渲染
     =========================================================================== */

  var tabFeatured = $('#ms-tab-featured');
  var tabContext = $('#ms-tab-context');
  var paneFeatured = $('#ms-pane-featured');
  var paneContext = $('#ms-pane-context');
  var ctxBody = $('#ms-ctx-body');
  var panel = $('#ms-panel');

  function showPane(which) {
    var isCtx = which === 'context';
    if (tabFeatured) { tabFeatured.classList.toggle('is-on', !isCtx); tabFeatured.setAttribute('aria-selected', String(!isCtx)); }
    if (tabContext) { tabContext.classList.toggle('is-on', isCtx); tabContext.setAttribute('aria-selected', String(isCtx)); }
    if (paneFeatured) { paneFeatured.classList.toggle('is-on', !isCtx); }
    if (paneContext) { paneContext.classList.toggle('is-on', isCtx); }
  }
  if (tabFeatured) { tabFeatured.addEventListener('click', function () { showPane('featured'); }); }
  if (tabContext) { tabContext.addEventListener('click', function () { showPane('context'); }); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function textOf(el) { return el ? el.textContent.trim() : ''; }

  function collectDaySummary(day, msg) {
    var out = [];
    var all = $$('.ms-msg', day);
    var at = all.indexOf(msg);
    var order = [];
    if (at > 0) { order.push(all[at - 1]); }
    order.push(msg);
    if (at >= 0 && all[at + 1]) { order.push(all[at + 1]); }
    if (at >= 0 && all[at + 2]) { order.push(all[at + 2]); }
    order.forEach(function (m) {
      if (!m) { return; }
      var line = textOf(m.querySelector('.ms-txt')) ||
                 textOf(m.querySelector('.ms-tr__t')) ||
                 textOf(m.querySelector('.ms-cap')) ||
                 textOf(m.querySelector('.ms-money__t')) ||
                 textOf(m.querySelector('.ms-file__n')) ||
                 textOf(m.querySelector('.ms-link__t'));
      if (!line) { return; }
      var grp = m.closest('.ms-grp');
      out.push({
        name: grp ? grp.getAttribute('data-sender') : '系统',
        avatar: grp ? (grp.querySelector('.ms-ava img') || {}).src : '',
        time: grp ? textOf(grp.querySelector('.ms-grp__t')) : '',
        text: line,
        origin: m === msg
      });
    });
    return out;
  }

  function renderContext(msg, preferSrc) {
    if (!msg || !ctxBody) { return; }
    var day = msg.closest('.ms-day');
    var grp = msg.closest('.ms-grp');
    var assets = (msg.getAttribute('data-assets') || '').split('|').filter(Boolean);
    if (!assets.length) {
      var one = msg.querySelector('.ms-photo img, .ms-tile img');
      if (one) { assets = [one.getAttribute('src')]; }
    }
    var heroSrc = preferSrc && assets.indexOf(preferSrc) >= 0 ? preferSrc : assets[0];
    var firstTile = msg.querySelector('.js-photo');
    var people = (firstTile ? firstTile.getAttribute('data-people') || '' : '').split(',').filter(Boolean);
    var sender = grp ? grp.getAttribute('data-sender') : '系统';
    var time = grp ? textOf(grp.querySelector('.ms-grp__t')) : '';
    var place = grp ? textOf(grp.querySelector('.ms-grp__p')) : '';
    var dayLabel = day ? day.getAttribute('data-label') : '';
    var cap = textOf(msg.querySelector('.ms-cap'));
    var groupName = textOf($('#ms-arch-name'));

    var summary = collectDaySummary(day, msg);
    var others = $$('.js-photo img', day)
      .map(function (im) { return im.getAttribute('src'); })
      .filter(function (src) { return assets.indexOf(src) < 0; })
      .slice(0, 6);

    var html = '';

    if (heroSrc) {
      html += '<section class="ms-sec">' +
        '<div class="ms-ctx__hero"><img src="' + esc(heroSrc) + '" alt="' + esc(dayLabel + ' ' + place + ' 由 ' + sender + ' 发出的照片') + '" loading="lazy" decoding="async"></div>' +
        '<p class="ms-ctx__title">' + esc(cap || (dayLabel + ' 的照片')) + '</p>' +
        '<p class="ms-ctx__sub">' + esc(sender + ' 发于 ' + dayLabel + ' ' + time) + '</p>' +
        '</section>';
    }

    html += '<section class="ms-sec">' +
      '<div class="ms-sec__h"><h3 class="ms-sec__t">这张的出处</h3><span class="ms-sec__x">已归档</span></div>' +
      '<div class="ms-kv">' +
        '<p class="ms-kv__row"><span class="ms-kv__k">发送者</span><span class="ms-kv__v">' + esc(sender) + '</span></p>' +
        '<p class="ms-kv__row"><span class="ms-kv__k">时间</span><span class="ms-kv__v">' + esc(dayLabel + ' ' + time) + '</span></p>' +
        '<p class="ms-kv__row"><span class="ms-kv__k">地点</span><span class="ms-kv__v">' + esc(place || '这张没有位置信息') + '</span></p>' +
        '<p class="ms-kv__row"><span class="ms-kv__k">来自</span><span class="ms-kv__v">' + esc(groupName) + '</span></p>' +
        '<p class="ms-kv__row"><span class="ms-kv__k">同条消息</span><span class="ms-kv__v">' + assets.length + ' 张</span></p>' +
      '</div></section>';

    if (summary.length) {
      html += '<section class="ms-sec">' +
        '<div class="ms-sec__h"><h3 class="ms-sec__t">发出前后的对话</h3><span class="ms-sec__x">' + summary.length + ' 条</span></div>' +
        '<div class="ms-quotes">';
      summary.forEach(function (s) {
        html += '<div class="ms-qrow' + (s.origin ? ' is-origin' : '') + '">' +
          '<span class="ms-qrow__ava"><img src="' + esc(s.avatar) + '" alt="' + esc(s.name) + '" loading="lazy" decoding="async"></span>' +
          '<span><span class="ms-qrow__h">' + esc(s.name + ' · ' + s.time) + '</span>' +
          '<span class="ms-qrow__t">' + esc(s.text) + '</span></span></div>';
      });
      html += '</div></section>';
    }

    html += '<section class="ms-sec">' +
      '<div class="ms-sec__h"><h3 class="ms-sec__t">这张里的人</h3><span class="ms-sec__x">' + (people.length || 0) + ' 位</span></div>';
    if (people.length) {
      html += '<div class="ms-chips">';
      people.forEach(function (p) {
        var av = AVATARS[p] || 'assets/people/u01.jpg';
        html += '<button type="button" class="ms-chip js-person" data-person="' + esc(p) + '">' +
          '<img src="' + esc(av) + '" alt="' + esc(p) + '" loading="lazy" decoding="async">' + esc(p) + '</button>';
      });
      html += '</div>';
    } else {
      html += '<p class="ms-ctx__sub">这张里没有认出面孔，多半是风景。</p>';
    }
    html += '</section>';

    if (others.length) {
      html += '<section class="ms-sec">' +
        '<div class="ms-sec__h"><h3 class="ms-sec__t">同一天的其他照片</h3><span class="ms-sec__x">' + others.length + ' 张</span></div>' +
        '<div class="ms-mini">';
      others.forEach(function (src) {
        html += '<button type="button" class="ms-tile js-photo" data-photo="' + esc(src) + '" data-caption="' + esc(cap) + '" data-date="' + esc(dayLabel) + '" data-place="' + esc(place) + '" data-group="' + esc(groupName) + '" data-people="' + esc(people.join(',')) + '">' +
          '<img src="' + esc(src) + '" alt="' + esc(dayLabel + ' 的照片') + '" loading="lazy" decoding="async"></button>';
      });
      html += '</div></section>';
    }

    ctxBody.innerHTML = html;
    showPane('context');
    if (window.innerWidth <= 1023 && panel) { openDrawer(panel); }
  }

  var AVATARS = {
    '林知遥': 'assets/people/u01.jpg', '陈屿': 'assets/people/u02.jpg', '苏念': 'assets/people/u03.jpg',
    '周斯年': 'assets/people/u04.jpg', '何时': 'assets/people/u05.jpg', '许清和': 'assets/people/u06.jpg',
    '江野': 'assets/people/u07.jpg', '温言': 'assets/people/u08.jpg', '沈随意': 'assets/people/u09.jpg',
    '罗一鸣': 'assets/people/u10.jpg', '钟晚': 'assets/people/u11.jpg', '叶生': 'assets/people/u12.jpg'
  };

  function highlightMsg(msg) {
    if (!msg) { return; }
    $$('.ms-msg.is-pinned', stream).forEach(function (m) { m.classList.remove('is-pinned'); });
    msg.classList.add('is-pinned');
    msg.classList.remove('is-focus');
    void msg.offsetWidth;
    msg.classList.add('is-focus');
    msg.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  }

  /* ===========================================================================
     7 · 时间线内的交互：引用跳转、附和展开、rail 操作
     =========================================================================== */

  stream.addEventListener('click', function (e) {
    var target = e.target;

    var quote = target.closest ? target.closest('.ms-quote') : null;
    if (quote) {
      var dest = document.getElementById(quote.getAttribute('data-quote'));
      if (dest) { highlightMsg(dest); }
      return;
    }

    var echo = target.closest ? target.closest('.ms-echo') : null;
    if (echo) {
      var list = echo.parentNode.querySelector('.ms-echo__list');
      var open = list.classList.toggle('is-open');
      echo.setAttribute('aria-expanded', String(open));
      echo.lastChild.nodeValue = open ? ' 5 条附和 · 收起 ' : ' 5 条附和 · 展开 ';
      return;
    }

    var act = target.closest ? target.closest('.ms-act') : null;
    if (!act) { return; }
    var kind = act.getAttribute('data-act');
    var msg = act.closest('.ms-msg');

    if (kind === 'context') {
      highlightMsg(msg);
      renderContext(msg);
    } else if (kind === 'day') {
      var day = act.closest('.ms-day');
      gotoDay(day);
    } else if (kind === 'copy') {
      var txt = textOf(msg.querySelector('.ms-txt')) || textOf(msg.querySelector('.ms-cap'));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast('已复制这条消息'); }, function () { toast('复制失败，请手动选中'); });
      } else {
        toast('这个浏览器不支持一键复制，请手动选中');
      }
    }
  });

  /* ===========================================================================
     8 · 群切换
     =========================================================================== */

  var glist = $('#ms-glist');
  var archName = $('#ms-arch-name');
  var archMeta = $('#ms-arch-meta');
  var archCover = $('#ms-arch-cover');
  var emptyBox = null;

  function showGroupEmpty(name, msgs, photos, span) {
    if (!emptyBox) {
      emptyBox = document.createElement('div');
      emptyBox.className = 'ms-empty';
      emptyBox.style.margin = 'var(--space-11) var(--space-7)';
      stream.parentNode.insertBefore(emptyBox, stream.nextSibling);
    }
    emptyBox.innerHTML =
      '<p class="ms-empty__t">「' + esc(name) + '」还没有导入到本地</p>' +
      '<p class="ms-empty__d">这个群有 ' + esc(msgs) + ' 条消息、' + esc(photos) + ' 张照片，跨度 ' + esc(span) +
      '。导入之后，这里会按天重新排好版，语音会自动转写。</p>' +
      '<p class="ms-empty__d"><button type="button" class="ms-btn js-upload" style="margin-top: var(--space-4)">导入这个群的聊天记录</button></p>';
    emptyBox.hidden = false;
    stream.hidden = true;
  }

  function hideGroupEmpty() {
    if (emptyBox) { emptyBox.hidden = true; }
    stream.hidden = false;
  }

  if (glist) {
    glist.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.ms-g') : null;
      if (!btn) { return; }
      $$('.ms-g', glist).forEach(function (g) { g.classList.remove('is-on'); g.removeAttribute('aria-current'); });
      btn.classList.add('is-on');
      btn.setAttribute('aria-current', 'true');

      var name = btn.getAttribute('data-group');
      var msgs = btn.getAttribute('data-msgs');
      var photos = btn.getAttribute('data-photos');
      var span = btn.getAttribute('data-span');
      var members = btn.getAttribute('data-members');
      if (archName) { archName.textContent = name; }
      if (archMeta) { archMeta.textContent = msgs + ' 条消息 · ' + photos + ' 张照片 · ' + span + ' · ' + members + ' 人在群'; }
      if (archCover) { archCover.setAttribute('src', btn.getAttribute('data-cover')); }

      var dot = btn.querySelector('.ms-g__dot');
      if (dot && !dot.classList.contains('is-empty')) { dot.classList.add('is-empty'); }

      if (name === '老友记 · 永不解散') {
        hideGroupEmpty();
        toast('已切换到 ' + name);
        if (scroller) { scroller.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); }
      } else {
        showGroupEmpty(name, msgs, photos, span);
        toast('已切换到 ' + name + ' · 这个群还没导入');
      }
      if (window.innerWidth <= 1023) { closeDrawers(); }
    });
  }

  /* 群列表筛选 */
  var findIn = $('#ms-find');
  if (findIn) {
    findIn.addEventListener('input', function () {
      var q = findIn.value.trim();
      $$('.ms-g', glist).forEach(function (g) {
        var hit = !q || g.getAttribute('data-group').indexOf(q) >= 0 ||
                  textOf(g.querySelector('.ms-g__last')).indexOf(q) >= 0;
        g.hidden = !hit;
      });
    });
  }

  /* ===========================================================================
     9 · 侧栏折叠 / 窄屏抽屉
     =========================================================================== */

  var scrim = $('#ms-scrim');
  var openPanel = $('#ms-open-panel');

  function openDrawer(el) {
    if (!el) { return; }
    el.classList.add('is-open');
    root.classList.add('is-drawer-open');
  }
  function closeDrawers() {
      if (panel) { panel.classList.remove('is-open'); }
    root.classList.remove('is-drawer-open');
  }

  if (openPanel) { openPanel.addEventListener('click', function () { openDrawer(panel); }); }
  if (scrim) { scrim.addEventListener('click', closeDrawers); }

  /* ===========================================================================
     10 · 顶部按钮与键盘
     =========================================================================== */

  var exportBtn = $('#ms-export');
  var settingsBtn = $('#ms-settings');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      toast('正在准备导出包：38,204 条消息 + 12,847 张原图，完成后会在这里提示');
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function () {
      toast('群设置：成员名册、群大事记、留言板');
    });
  }

  document.addEventListener('keydown', function (e) {
    var view = document.getElementById('view-messages');
    if (!view || view.hasAttribute('hidden')) { return; }
    if (e.key !== 'Escape') { return; }
    if (root.classList.contains('is-drawer-open')) { e.preventDefault(); closeDrawers(); return; }
    if (searchIn && searchIn.value) { e.preventDefault(); searchIn.value = ''; runSearch(''); return; }
    if (playingVoice) { stopVoice(playingVoice, true); }
    if (playingVideo) { stopVideo(playingVideo, true); }
  });

  /* ===========================================================================
     11 · 对外接口：供图库 / 看图器跳转过来时定位
     =========================================================================== */

  function focusPhoto(src) {
    if (!src) { return false; }
    var tile = null;
    $$('.js-photo', stream).forEach(function (b) {
      if (tile) { return; }
      var im = b.querySelector('img');
      if (b.getAttribute('data-photo') === src || (im && im.getAttribute('src') === src)) { tile = b; }
    });
    if (!tile) { return false; }
    var msg = tile.closest('.ms-msg');
    highlightMsg(msg);
    renderContext(msg, src);
    return true;
  }

  function focusMessage(id) {
    var msg = document.getElementById(id);
    if (!msg) { return false; }
    highlightMsg(msg);
    renderContext(msg);
    return true;
  }

  window.SG = window.SG || {};
  window.SG.messages = { focusPhoto: focusPhoto, focusMessage: focusMessage, toast: toast };
  window.SGMessages = window.SG.messages;
}
