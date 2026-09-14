/* =============================================================================
   时光 · 全屏叠层模块 overlays
   回忆播放器 / 看图器 / 上传面板 / 管理面板 / 人物详情 / 旅程详情
   由外层统一调用 initOverlays()，本文件不自动执行
   ============================================================================= */

function initOverlays() {
  'use strict';

  var root = document.getElementById('ov-root');
  if (!root || root.dataset.ovReady === '1') { return; }
  root.dataset.ovReady = '1';

  var html = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function reduced() {
    if (html.getAttribute('data-motion') === 'off') { return true; }
    return !!(reduceMQ && reduceMQ.matches);
  }
  function raf(fn) { return window.requestAnimationFrame(fn); }
  function reflow(el) { return el && el.offsetWidth; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }
  function hash(str) {
    var h = 2166136261, i;
    for (i = 0; i < String(str).length; i++) { h = (h ^ String(str).charCodeAt(i)) * 16777619 >>> 0; }
    return h >>> 0;
  }
  function pick(arr, seed) { return arr[hash(seed) % arr.length]; }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* =========================================================================
     1 · 数据
     ========================================================================= */

  var GROUP_MAIN = '老友记 · 永不解散';

  var PEOPLE = [
    { n: '林知遥', f: 'u01', c: 2184, city: '杭州', role: '拍得最多的人' },
    { n: '陈屿',   f: 'u02', c: 1976, city: '杭州', role: '群主' },
    { n: '苏念',   f: 'u03', c: 1742, city: '上海', role: '语音最多的人' },
    { n: '周斯年', f: 'u04', c: 1508, city: '深圳', role: '' },
    { n: '何时',   f: 'u05', c: 1347, city: '成都', role: '' },
    { n: '许清和', f: 'u06', c: 1192, city: '南京', role: '' },
    { n: '江野',   f: 'u07', c: 1036, city: '杭州', role: '爬山召集人' },
    { n: '温言',   f: 'u08', c: 924,  city: '广州', role: '' },
    { n: '沈随意', f: 'u09', c: 812,  city: '北京', role: '' },
    { n: '罗一鸣', f: 'u10', c: 706,  city: '杭州', role: '养猫的人' },
    { n: '钟晚',   f: 'u11', c: 598,  city: '厦门', role: '' },
    { n: '叶生',   f: 'u12', c: 473,  city: '杭州', role: '已退群，内容保留' }
  ];
  var PEOPLE_BY_NAME = {};
  PEOPLE.forEach(function (p) { PEOPLE_BY_NAME[p.n] = p; });

  function faceOf(name) {
    var p = PEOPLE_BY_NAME[name];
    return p ? 'assets/people/' + p.f + '.jpg' : 'assets/people/u01.jpg';
  }

  var PHOTOS = [];
  (function () {
    for (var i = 1; i <= 101; i++) {
      PHOTOS.push('assets/photos/p' + (i < 10 ? '00' : i < 100 ? '0' : '') + i + '.jpg');
    }
  })();

  var PLACES = [
    '杭州 · 教工路', '杭州 · 滨江', '舟山 · 东极岛', '甘孜 · 稻城亚丁', '大理 · 双廊',
    '呼伦贝尔 · 额尔古纳', '厦门 · 鼓浪屿', '莫干山', '南京 · 玄武湖', '北京 · 五道营'
  ];
  var DEVICES = ['iPhone 15 Pro', 'iPhone 13 Pro', 'iPhone XS', '索尼 A7 III', '富士 X-T4', '佳能 EOS R6'];
  var RESOS = ['4032 × 3024', '6000 × 4000', '3024 × 4032', '5472 × 3648', '4000 × 2667'];

  /* 没有显式元数据时，用文件名派生一份稳定的假数据，保证同一张图每次都一样 */
  function metaOf(src, given) {
    var h = hash(src);
    var y = 2017 + (h % 9);
    var m = 1 + (h >> 3) % 12;
    var d = 1 + (h >> 7) % 28;
    return {
      date: (given && given.date) || (y + '年' + m + '月' + d + '日'),
      place: (given && given.place) || pick(PLACES, src + 'p'),
      device: pick(DEVICES, src + 'd'),
      reso: pick(RESOS, src + 'r'),
      size: ((h % 62) / 10 + 1.8).toFixed(1) + ' MB',
      time: (7 + (h >>> 5) % 13) + ':' + String((h >>> 11) % 60).padStart(2, '0')
    };
  }

  var TRIPS = {
    '大理 · 洱海边的四天': {
      cover: 'assets/photos/p021.jpg',
      range: '2019年8月10日 — 8月13日', days: 4, count: 128, who: ['林知遥', '陈屿', '苏念', '周斯年', '何时', '许清和', '江野'],
      route: [
        { n: '昆明', d: '8月10日', t: 'assets/photos/p082.jpg' },
        { n: '大理古城', d: '8月11日', t: 'assets/photos/p074.jpg' },
        { n: '双廊', d: '8月12日', t: 'assets/photos/p021.jpg' },
        { n: '喜洲', d: '8月13日', t: 'assets/photos/p062.jpg' }
      ],
      legs: ['338 km · 大巴', '42 km · 环海路', '18 km · 骑行'],
      pool: ['p021', 'p018', 'p037', 'p040', 'p050', 'p017', 'p045', 'p039', 'p049', 'p055', 'p087', 'p070', 'p034', 'p036'],
      notes: ['这一天 34 张 · 走了 6.2 公里', '这一天 41 张 · 环了半个洱海', '这一天 38 张 · 在双廊待了一整天', '这一天 15 张 · 回程前的早饭']
    },
    '稻城亚丁 · 雪线上的七天': {
      cover: 'assets/photos/p001.jpg',
      range: '2023年10月2日 — 10月8日', days: 7, count: 964, who: ['林知遥', '陈屿', '苏念', '周斯年', '江野', '温言'],
      route: [
        { n: '成都', d: '10月2日', t: 'assets/photos/p079.jpg' },
        { n: '康定', d: '10月3日', t: 'assets/photos/p068.jpg' },
        { n: '稻城', d: '10月4日', t: 'assets/photos/p072.jpg' },
        { n: '亚丁', d: '10月5日', t: 'assets/photos/p001.jpg' }
      ],
      legs: ['368 km · 大巴', '412 km · 越野车', '78 km · 摆渡车'],
      pool: ['p001', 'p011', 'p023', 'p029', 'p061', 'p065', 'p068', 'p096', 'p014', 'p053', 'p100', 'p019', 'p015', 'p072'],
      notes: ['这一天 96 张 · 海拔 500 米', '这一天 142 张 · 翻了折多山', '这一天 187 张 · 海拔 3,750 米', '这一天 214 张 · 海拔最高 4,150 米']
    },
    '呼伦贝尔 · 草原上的五天': {
      cover: 'assets/photos/p101.jpg',
      range: '2018年7月21日 — 7月25日', days: 5, count: 673, who: ['林知遥', '陈屿', '何时', '许清和', '钟晚'],
      route: [
        { n: '海拉尔', d: '7月21日', t: 'assets/photos/p067.jpg' },
        { n: '额尔古纳', d: '7月22日', t: 'assets/photos/p022.jpg' },
        { n: '室韦', d: '7月23日', t: 'assets/photos/p025.jpg' },
        { n: '满洲里', d: '7月25日', t: 'assets/photos/p101.jpg' }
      ],
      legs: ['186 km · 自驾', '154 km · 自驾', '246 km · 自驾'],
      pool: ['p101', 'p062', 'p066', 'p067', 'p022', 'p075', 'p028', 'p025', 'p069', 'p016', 'p015', 'p100', 'p048', 'p046'],
      notes: ['这一天 88 张 · 落地就开进草原', '这一天 164 张 · 一路都是牧场', '这一天 203 张 · 住在河边', '这一天 141 张 · 最后一场落日']
    },
    '东极岛 · 看日出的三天': {
      cover: 'assets/photos/p003.jpg',
      range: '2021年7月16日 — 7月18日', days: 3, count: 486, who: ['林知遥', '陈屿', '苏念', '周斯年', '何时', '许清和', '江野', '温言'],
      route: [
        { n: '杭州', d: '7月16日', t: 'assets/photos/p051.jpg' },
        { n: '沈家门', d: '7月16日', t: 'assets/photos/p087.jpg' },
        { n: '庙子湖', d: '7月17日', t: 'assets/photos/p003.jpg' }
      ],
      legs: ['242 km · 大巴', '52 海里 · 快艇'],
      pool: ['p003', 'p020', 'p012', 'p039', 'p049', 'p098', 'p099', 'p055', 'p087', 'p037', 'p044', 'p094', 'p018', 'p041'],
      notes: ['这一天 102 张 · 船开了两个半小时', '这一天 268 张 · 五点起来看日出', '这一天 116 张 · 走了岛的另一头']
    }
  };

  function tripOf(name) {
    if (TRIPS[name]) { return TRIPS[name]; }
    return {
      cover: 'assets/photos/p004.jpg',
      range: '2022年5月20日 — 5月22日', days: 3, count: 214, who: ['林知遥', '陈屿', '苏念', '周斯年'],
      route: [
        { n: '杭州', d: '5月20日', t: 'assets/photos/p051.jpg' },
        { n: '莫干山', d: '5月21日', t: 'assets/photos/p015.jpg' },
        { n: '德清', d: '5月22日', t: 'assets/photos/p017.jpg' }
      ],
      legs: ['86 km · 自驾', '32 km · 盘山路'],
      pool: ['p015', 'p014', 'p017', 'p025', 'p032', 'p048', 'p073', 'p089', 'p016', 'p075', 'p050', 'p053', 'p036', 'p031'],
      notes: ['这一天 46 张 · 傍晚才到', '这一天 118 张 · 在山上走了一天', '这一天 50 张 · 下山吃了顿饭']
    };
  }

  var MEDIA = [
    { name: 'IMG_4821.HEIC', sum: '建群八周年当天的长桌合影', type: 'photo', group: GROUP_MAIN, sender: '陈屿', date: '2025-09-06', bytes: 4404019, size: '4.2 MB', tags: ['合影', '值得留着'], thumb: 'assets/photos/p041.jpg' },
    { name: '八周年 · 长桌.jpg', sum: '21 人围着一张长桌', type: 'photo', group: GROUP_MAIN, sender: '林知遥', date: '2025-09-06', bytes: 7130316, size: '6.8 MB', tags: ['合影'], thumb: 'assets/photos/p033.jpg' },
    { name: '日出全程.mp4', sum: '13 分 06 秒 · 东极岛的那个清晨', type: 'video', group: GROUP_MAIN, sender: '周斯年', date: '2021-07-17', bytes: 228589568, size: '218 MB', tags: ['海'], thumb: 'assets/photos/p003.jpg' },
    { name: '语音 0:23', sum: '「船票买到了，五点集合」', type: 'audio', group: GROUP_MAIN, sender: '苏念', date: '2021-07-16', bytes: 186368, size: '182 KB', tags: [], thumb: '' },
    { name: '稻城 · 原图合集.zip', sum: '原文件已过期 · 本地已备份', type: 'file', group: '山系周末', sender: '江野', date: '2023-10-09', bytes: 1932735283, size: '1.8 GB', tags: ['山'], thumb: '' },
    { name: '洱海边的清晨.jpg', sum: '双廊，太阳刚出来', type: 'photo', group: GROUP_MAIN, sender: '陈屿', date: '2019-08-11', bytes: 5347737, size: '5.1 MB', tags: ['海', '日落'], thumb: 'assets/photos/p021.jpg' },
    { name: '语音 0:09', sum: '「高反了，谁有葡萄糖」', type: 'audio', group: '山系周末', sender: '温言', date: '2023-10-04', bytes: 72704, size: '71 KB', tags: [], thumb: '' },
    { name: '毕业设计开题.doc', sum: '最早的一个文件', type: 'file', group: GROUP_MAIN, sender: '何时', date: '2020-11-03', bytes: 2516582, size: '2.4 MB', tags: [], thumb: '' },
    { name: '一首歌', sum: '2019年8月11日 05:20 发在东极岛', type: 'link', group: GROUP_MAIN, sender: '许清和', date: '2019-08-11', bytes: 12288, size: '12 KB', tags: [], thumb: '' },
    { name: '雪山垭口.jpg', sum: '海拔 4,150 米', type: 'photo', group: '山系周末', sender: '江野', date: '2023-10-05', bytes: 7654605, size: '7.3 MB', tags: ['山'], thumb: 'assets/photos/p001.jpg' },
    { name: '窗台上的橘猫.jpg', sum: '罗一鸣家的猫，第 331 张', type: 'photo', group: '家里', sender: '罗一鸣', date: '2024-03-18', bytes: 3774873, size: '3.6 MB', tags: ['猫'], thumb: 'assets/photos/p092.jpg' },
    { name: '婚礼全程.mp4', sum: '13 分 06 秒 · 最长的一段视频', type: 'video', group: GROUP_MAIN, sender: '林知遥', date: '2022-05-21', bytes: 1288490188, size: '1.2 GB', tags: ['婚礼'], thumb: 'assets/photos/p043.jpg' },
    { name: '草原落日.jpg', sum: '满洲里，最后一场落日', type: 'photo', group: GROUP_MAIN, sender: '钟晚', date: '2018-07-24', bytes: 5138022, size: '4.9 MB', tags: ['日落'], thumb: 'assets/photos/p101.jpg' },
    { name: '夜里的桥.jpg', sum: '过江的时候拍的', type: 'photo', group: '周末搭子局', sender: '叶生', date: '2024-11-09', bytes: 5662310, size: '5.4 MB', tags: ['夜景'], thumb: 'assets/photos/p076.jpg' }
  ];
  var TYPE_LABEL = { photo: '照片', video: '视频', audio: '语音', file: '文件', link: '链接' };

  var YEARS_MSG = [
    { y: 2017, m: 1842, p: 612, gb: 2.1 }, { y: 2018, m: 4106, p: 1384, gb: 3.4 },
    { y: 2019, m: 6884, p: 2306, gb: 9.8 }, { y: 2020, m: 3912, p: 1118, gb: 4.2 },
    { y: 2021, m: 5470, p: 1842, gb: 5.1 }, { y: 2022, m: 4238, p: 1406, gb: 4.4 },
    { y: 2023, m: 5126, p: 1724, gb: 8.9 }, { y: 2024, m: 4012, p: 1342, gb: 5.3 },
    { y: 2025, m: 2614, p: 1113, gb: 5.0 }
  ];

  /* =========================================================================
     2 · 叠层基座：开关、滚动锁、焦点陷阱、Esc
     ========================================================================= */

  var stack = [];
  var SEL_FOCUS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function focusables(layer) {
    return [].filter.call(layer.querySelectorAll(SEL_FOCUS), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function openLayer(layer, onOpen) {
    if (!layer || stack.indexOf(layer) > -1) { return; }
    layer.__ovReturn = document.activeElement;
    layer.hidden = false;
    reflow(layer);
    layer.classList.add('is-open');
    stack.push(layer);
    html.classList.add('ov-lock');
    if (onOpen) { onOpen(); }
    raf(function () {
      var f = focusables(layer);
      (f[0] || layer).focus({ preventScroll: true });
    });
  }

  function closeLayer(layer, onClosed) {
    var i = stack.indexOf(layer);
    if (i < 0) { return; }
    stack.splice(i, 1);
    layer.classList.remove('is-open');
    if (!stack.length) { html.classList.remove('ov-lock'); }
    window.setTimeout(function () {
      if (stack.indexOf(layer) < 0) { layer.hidden = true; }
      if (onClosed) { onClosed(); }
    }, reduced() ? 0 : 320);
    var back = layer.__ovReturn;
    if (back && back.focus && document.contains(back)) { back.focus({ preventScroll: true }); }
  }

  function topLayer() { return stack[stack.length - 1] || null; }

  document.addEventListener('keydown', function (e) {
    var layer = topLayer();
    if (!layer) { return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (layer === elViewer && elViewer.classList.contains('is-info')) { toggleInfo(false); return; }
      if (layer === elViewer) { closeViewer(); return; }
      if (layer === elPlayer) { closePlayer(); return; }
      if (layer === elUpload) { closeLayer(elUpload); return; }
      if (layer === elManage) { closeLayer(elManage); return; }
      if (layer === elDetail) { closeLayer(elDetail); return; }
      return;
    }
    if (e.key === 'Tab') {
      var f = focusables(layer);
      if (!f.length) { return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (layer === elPlayer) { playerKey(e); }
    else if (layer === elViewer) { viewerKey(e); }
  });

  function closeAll() {
    stack.slice().reverse().forEach(function (l) {
      if (l === elPlayer) { closePlayer(); }
      else if (l === elViewer) { closeViewer(); }
      else { closeLayer(l); }
    });
  }

  /* =========================================================================
     3 · A 回忆播放器
     ========================================================================= */

  var elPlayer = $('ov-player');
  var plTrack = $('ov-player-track');
  var plSlides = [].slice.call(plTrack.querySelectorAll('.ov-player__slide'));
  var plSegs = $('ov-player-segs');
  var plIntro = $('ov-player-intro');
  var plCap = $('ov-player-cap');
  var plEnd = $('ov-player-end');
  var plLive = $('ov-player-live');
  var KB = ['ov-kb-a', 'ov-kb-b', 'ov-kb-c', 'ov-kb-d'];
  var HOLD = 4500, FADE = 1200;

  var pl = { list: [], i: -1, layer: 0, playing: false, anim: null, timer: 0, idle: 0, kbPrev: -1, title: '', sub: '' };

  function plVariant() {
    var i;
    do { i = Math.floor(Math.random() * KB.length); } while (i === pl.kbPrev);
    pl.kbPrev = i;
    return KB[i];
  }

  function buildSegs(n) {
    plSegs.innerHTML = '';
    plSegs.setAttribute('aria-valuemax', String(n));
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'ov-player__seg';
      s.innerHTML = '<span class="ov-player__segfill"></span>';
      plSegs.appendChild(s);
    }
  }

  function plShow(i) {
    if (i >= pl.list.length) { return plFinish(); }
    if (i < 0) { i = 0; }
    pl.i = i;

    var item = pl.list[i];
    var next = plSlides[pl.layer % 2];
    var prev = plSlides[(pl.layer + 1) % 2];
    pl.layer++;

    var img = next.querySelector('.ov-player__img');
    img.src = item.src;
    img.alt = item.caption;
    next.classList.remove('is-mute');
    next.style.zIndex = String(pl.layer + 1);
    if (!reduced()) {
      KB.forEach(function (k) { img.classList.remove(k); });
      img.style.animation = 'none';
      reflow(img);
      img.style.animation = '';
      img.classList.add(plVariant());
    }
    raf(function () { next.classList.add('is-live'); });

    window.setTimeout(function () {
      if (prev === plSlides[(pl.layer + 1) % 2]) { return; }
      prev.classList.add('is-mute');
      prev.classList.remove('is-live');
      var pimg = prev.querySelector('.ov-player__img');
      KB.forEach(function (k) { pimg.classList.remove(k); });
      raf(function () { prev.classList.remove('is-mute'); });
    }, FADE + 60);

    /* 字幕 */
    plCap.classList.remove('is-in');
    $('ov-player-cap-t').textContent = item.caption;
    $('ov-player-cap-m').textContent = item.date + ' · ' + item.place;
    reflow(plCap);
    raf(function () { plCap.classList.add('is-in'); });

    $('ov-player-now-t').textContent = item.date;
    $('ov-player-now-s').textContent = item.place + ' · 第 ' + (i + 1) + ' 张，共 ' + pl.list.length + ' 张';
    plSegs.setAttribute('aria-valuenow', String(i + 1));
    plLive.textContent = item.caption + '，' + item.date + '，第 ' + (i + 1) + ' 张，共 ' + pl.list.length + ' 张';

    plProgress(i);
  }

  function plProgress(i) {
    if (pl.anim) { try { pl.anim.cancel(); } catch (e) {} pl.anim = null; }
    var fills = plSegs.querySelectorAll('.ov-player__segfill');
    for (var k = 0; k < fills.length; k++) {
      fills[k].style.transform = k < i ? 'scaleX(1)' : 'scaleX(0)';
    }
    var seg = fills[i];
    if (!seg) { return; }
    var dur = reduced() ? HOLD * 1.5 : HOLD;
    if (seg.animate) {
      pl.anim = seg.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: dur, easing: 'linear', fill: 'forwards' });
      pl.anim.onfinish = function () { plShow(pl.i + 1); };
      if (!pl.playing) { pl.anim.pause(); }
    } else {
      window.clearTimeout(pl.timer);
      if (pl.playing) { pl.timer = window.setTimeout(function () { plShow(pl.i + 1); }, dur); }
    }
  }

  function plPlay() {
    pl.playing = true;
    elPlayer.classList.remove('is-paused');
    $('ov-player-play').setAttribute('aria-label', '暂停');
    $('ov-player-play').setAttribute('aria-pressed', 'true');
    $('ov-player-play-icon').innerHTML = '<path d="M9 5h3v14H9zM14 5h3v14h-3z"/>';
    if (pl.anim) { pl.anim.play(); }
    plIdle();
  }
  function plPause() {
    pl.playing = false;
    elPlayer.classList.add('is-paused');
    elPlayer.classList.remove('is-idle');
    $('ov-player-play').setAttribute('aria-label', '播放');
    $('ov-player-play').setAttribute('aria-pressed', 'false');
    $('ov-player-play-icon').innerHTML = '<path d="M8 5.5l11 6.5-11 6.5z"/>';
    if (pl.anim) { pl.anim.pause(); }
    window.clearTimeout(pl.timer);
  }
  function plToggle() { pl.playing ? plPause() : plPlay(); }

  function plIdle() {
    elPlayer.classList.remove('is-idle');
    window.clearTimeout(pl.idle);
    if (!pl.playing) { return; }
    pl.idle = window.setTimeout(function () { elPlayer.classList.add('is-idle'); }, 2600);
  }

  function plFinish() {
    plPause();
    plEnd.hidden = false;
    reflow(plEnd);
    plEnd.classList.add('is-in');
    var secs = Math.round(pl.list.length * (HOLD / 1000));
    $('ov-player-end-s').textContent = pl.title + ' · ' + pl.list.length + ' 张 · ' +
      Math.floor(secs / 60) + ' 分 ' + String(secs % 60).padStart(2, '0') + ' 秒';
  }

  function openPlayer(trigger) {
    var title = trigger.getAttribute('data-memory-title') || '一段回忆';
    var sub = trigger.getAttribute('data-memory-sub') || '';
    var raws = (trigger.getAttribute('data-memory-photos') || '').split('|').filter(Boolean);
    if (!raws.length) {
      raws = ['p007', 'p022', 'p017', 'p037', 'p043', 'p066', 'p048', 'p030'].map(function (k) {
        return 'assets/photos/' + k + '.jpg';
      });
    }
    pl.title = title;
    pl.sub = sub;
    pl.list = raws.map(function (src, idx) {
      var m = metaOf(src);
      return {
        src: src,
        caption: pick(['那天的光', '走在前面的人', '回头看了一眼', '天亮之前', '路上', '最后一段路',
          '没人说话的十分钟', '刚下过雨', '等车的时候', '山那边'], src + idx),
        date: m.date,
        place: m.place
      };
    });

    $('ov-player-title').textContent = title;
    $('ov-player-sub').textContent = sub;
    plEnd.hidden = true;
    plEnd.classList.remove('is-in');
    buildSegs(pl.list.length);
    pl.i = -1;
    pl.layer = 0;
    plSlides.forEach(function (s) {
      s.classList.remove('is-live');
      var im = s.querySelector('.ov-player__img');
      KB.forEach(function (k) { im.classList.remove(k); });
    });

    openLayer(elPlayer, function () {
      plIntro.classList.remove('is-out');
      plIntro.classList.remove('is-in');
      raf(function () { plIntro.classList.add('is-in'); });
      window.setTimeout(function () {
        plIntro.classList.remove('is-in');
        plIntro.classList.add('is-out');
      }, 2200);
      window.setTimeout(function () {
        plShow(0);
        plPlay();
      }, reduced() ? 400 : 900);
    });
  }

  function closePlayer() {
    plPause();
    if (pl.anim) { try { pl.anim.cancel(); } catch (e) {} pl.anim = null; }
    closeLayer(elPlayer);
  }

  function playerKey(e) {
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); plToggle(); plIdle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); plShow(pl.i + 1); plIdle(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); plShow(Math.max(0, pl.i - 1)); plIdle(); }
  }

  $('ov-player-close').addEventListener('click', closePlayer);
  $('ov-player-play').addEventListener('click', function () { plToggle(); plIdle(); });
  $('ov-player-replay').addEventListener('click', function () {
    plEnd.classList.remove('is-in');
    window.setTimeout(function () { plEnd.hidden = true; }, 300);
    pl.i = -1;
    pl.layer = 0;
    plShow(0);
    plPlay();
  });
  $('ov-player-mute').addEventListener('click', function () {
    var music = $('ov-player-music');
    var muted = music.classList.toggle('is-muted');
    this.setAttribute('aria-pressed', muted ? 'true' : 'false');
    this.setAttribute('aria-label', muted ? '取消静音' : '静音');
    $('ov-player-mute-icon').innerHTML = muted
      ? '<path d="M11 5L6.5 9H3v6h3.5L11 19z"/><path d="M16 10l4 4M20 10l-4 4"/>'
      : '<path d="M11 5L6.5 9H3v6h3.5L11 19z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path d="M18.2 6.5a8 8 0 0 1 0 11"/>';
  });
  $('ov-player-save').addEventListener('click', function () {
    this.querySelector('.ov-player__act-label').textContent = '正在导出 1080p…';
    var btn = this;
    window.setTimeout(function () { btn.querySelector('.ov-player__act-label').textContent = '已存到本机'; }, 2400);
  });
  $('ov-player-share').addEventListener('click', function () {
    this.querySelector('.ov-player__act-label').textContent = '链接已复制';
    var btn = this;
    window.setTimeout(function () { btn.querySelector('.ov-player__act-label').textContent = '分享'; }, 2400);
  });
  $('ov-player-hit').addEventListener('click', function (e) {
    var r = this.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    if (x < 0.3) { plShow(Math.max(0, pl.i - 1)); }
    else if (x > 0.7) { plShow(pl.i + 1); }
    else { plToggle(); }
    plIdle();
  });
  elPlayer.addEventListener('pointermove', plIdle);

  /* =========================================================================
     4 · B 看图器
     ========================================================================= */

  var elViewer = $('ov-viewer');
  var vwImg = $('ov-viewer-img');
  var vwStage = $('ov-viewer-stage');
  var vwFilm = $('ov-viewer-film');
  var vwMenu = $('ov-viewer-menu');
  var vw = { list: [], i: 0, scale: 1, tx: 0, ty: 0, drag: null, src: null };

  function photoData(el) {
    return {
      el: el,
      src: el.getAttribute('data-photo') || (el.querySelector('img') ? el.querySelector('img').src : ''),
      caption: el.getAttribute('data-caption') || '',
      date: el.getAttribute('data-date') || '',
      place: el.getAttribute('data-place') || '',
      group: el.getAttribute('data-group') || GROUP_MAIN,
      people: (el.getAttribute('data-people') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    };
  }

  function collectGroup(el) {
    var scopeEl = el.closest('[data-photo-group]') || el.closest('.view') || el.closest('section') || document.body;
    var list = [].slice.call(scopeEl.querySelectorAll('.js-photo'));
    if (list.indexOf(el) < 0) { list = [el]; }
    return list.slice(0, 40);
  }

  function renderInfo(d) {
    var m = metaOf(d.src, d);
    $('ov-info-title').textContent = d.caption || '这张照片';
    $('ov-info-lead').textContent = (d.date || m.date) + ' ' + m.time + ' · ' + (d.place || m.place);

    $('ov-info-rows').innerHTML = [
      ['拍摄时间', (d.date || m.date) + ' ' + m.time],
      ['地点', d.place || m.place],
      ['设备', m.device],
      ['分辨率', m.reso],
      ['文件大小', m.size],
      ['已备份', '本机 + 私有存储']
    ].map(function (r) {
      return '<div class="ov-info__row"><span class="ov-info__k">' + esc(r[0]) +
        '</span><span class="ov-info__v">' + esc(r[1]) + '</span></div>';
    }).join('');

    var ppl = d.people.length ? d.people : [pick(PEOPLE, d.src + 'a').n, pick(PEOPLE, d.src + 'b').n];
    var seen = {};
    ppl = ppl.filter(function (n) { if (seen[n]) { return false; } seen[n] = 1; return true; });
    $('ov-info-people').innerHTML = ppl.map(function (n) {
      var p = PEOPLE_BY_NAME[n];
      return '<button type="button" class="ov-info__person js-person" data-person="' + esc(n) + '">' +
        '<img class="ov-info__face" src="' + faceOf(n) + '" alt="' + esc(n) + ' 的头像" loading="lazy" decoding="async">' +
        '<span><span class="ov-info__pname">' + esc(n) + '</span><br>' +
        '<span class="ov-info__pmeta">' + (p ? '出镜 ' + num(p.c) + ' 张' : '未命名人物') + '</span></span></button>';
    }).join('');

    $('ov-info-source').innerHTML =
      '<div class="ov-info__row"><span class="ov-info__k">群</span><span class="ov-info__v">' + esc(d.group) + '</span></div>' +
      '<div class="ov-info__row"><span class="ov-info__k">发送者</span><span class="ov-info__v">' + esc(pick(PEOPLE, d.src + 's').n) + '</span></div>' +
      '<div class="ov-info__row"><span class="ov-info__k">当时的回复</span><span class="ov-info__v">' + (3 + hash(d.src) % 14) + ' 条</span></div>';
  }

  function renderFilm() {
    vwFilm.innerHTML = vw.list.map(function (d, i) {
      return '<button type="button" class="ov-film__item' + (i === vw.i ? ' is-cur' : '') +
        '" role="option" aria-selected="' + (i === vw.i) + '" data-ov-film="' + i + '" tabindex="-1">' +
        '<img class="ov-film__img" src="' + esc(d.src) + '" alt="' + esc(d.caption || '第 ' + (i + 1) + ' 张') +
        '" loading="lazy" decoding="async"></button>';
    }).join('');
    var cur = vwFilm.querySelector('.is-cur');
    if (cur && cur.scrollIntoView) { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  }

  function setZoom(s, animate) {
    vw.scale = Math.min(4, Math.max(1, s));
    if (vw.scale === 1) { vw.tx = 0; vw.ty = 0; }
    elViewer.classList.toggle('is-zoomed', vw.scale > 1.001);
    vwImg.style.transition = animate ? '' : 'opacity var(--dur-2) linear';
    vwImg.style.transform = 'translate3d(' + vw.tx + 'px,' + vw.ty + 'px,0) scale(' + vw.scale.toFixed(3) + ')';
    $('ov-viewer-zoomval').textContent = Math.round(vw.scale * 100) + '%';
  }

  function renderPhoto(i, dir) {
    vw.i = (i + vw.list.length) % vw.list.length;
    var d = vw.list[vw.i];
    vwImg.classList.remove('is-ready');
    setZoom(1, false);
    vwImg.src = d.src;
    vwImg.alt = d.caption || ((d.date || '') + ' 的照片');
    $('ov-viewer-count').textContent = (vw.i + 1) + ' / ' + vw.list.length;
    $('ov-viewer-crumbs').textContent = d.group + (d.place ? ' · ' + d.place : '');
    $('ov-viewer-caption').innerHTML = '<span class="ov-viewer__caption-t">' + esc(d.caption || '这张照片') + '</span>' +
      (d.date ? ' · ' + esc(d.date) : '') + (d.place ? ' · ' + esc(d.place) : '');
    renderInfo(d);
    renderFilm();
    $('ov-viewer-fav').setAttribute('aria-pressed', 'false');
    $('ov-viewer-fav').classList.remove('is-on');
    var show = function () { vwImg.classList.add('is-ready'); };
    if (vwImg.complete && vwImg.naturalWidth) { show(); }
    else { vwImg.addEventListener('load', show, { once: true }); }
    if (dir && !reduced()) {
      vwImg.animate(
        [{ opacity: 0, transform: 'translate3d(' + (dir > 0 ? 26 : -26) + 'px,0,0) scale(.985)' },
         { opacity: 1, transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }
      );
    }
    var nxt = vw.list[vw.i + 1];
    if (nxt) { var pre = new Image(); pre.src = nxt.src; }
  }

  function flipRun(dir) {
    var d = vw.list[vw.i];
    if (!d || !d.el || reduced() || !vwImg.animate) { return Promise.resolve(); }
    var thumb = d.el.tagName === 'IMG' ? d.el : d.el.querySelector('img');
    if (!thumb) { return Promise.resolve(); }
    var first = thumb.getBoundingClientRect();
    var last = vwImg.getBoundingClientRect();
    if (!first.width || !last.width) { return Promise.resolve(); }

    var s = Math.max(first.width / last.width, first.height / last.height);
    var dx = (first.left + first.width / 2) - (last.left + last.width / 2);
    var dy = (first.top + first.height / 2) - (last.top + last.height / 2);
    var insetX = Math.max(0, (last.width - first.width / s) / 2);
    var insetY = Math.max(0, (last.height - first.height / s) / 2);
    var r0 = (parseFloat(window.getComputedStyle(thumb.parentNode).borderTopLeftRadius) || 12) / s;

    var flip = document.createElement('div');
    flip.className = 'ov-flip';
    flip.setAttribute('aria-hidden', 'true');
    flip.style.backgroundImage = 'url("' + String(thumb.currentSrc || thumb.src).replace(/"/g, '\\"') + '")';
    flip.style.left = last.left + 'px';
    flip.style.top = last.top + 'px';
    flip.style.width = last.width + 'px';
    flip.style.height = last.height + 'px';
    document.body.appendChild(flip);

    var shrunk = {
      transform: 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')',
      clipPath: 'inset(' + insetY.toFixed(1) + 'px ' + insetX.toFixed(1) + 'px ' + insetY.toFixed(1) + 'px ' +
        insetX.toFixed(1) + 'px round ' + r0.toFixed(1) + 'px)'
    };
    var full = { transform: 'translate(0px,0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 10px)' };
    var a = flip.animate(dir > 0 ? [shrunk, full] : [full, shrunk],
      { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    d.el.classList.add('ov-src-hidden');
    return (a.finished || Promise.resolve()).catch(function () {}).then(function () {
      flip.classList.add('is-out');
      window.setTimeout(function () { if (flip.parentNode) { flip.parentNode.removeChild(flip); } }, 240);
    });
  }

  function toggleInfo(on) {
    var next = on === undefined ? !elViewer.classList.contains('is-info') : on;
    elViewer.classList.toggle('is-info', next);
    $('ov-viewer-infobtn').setAttribute('aria-pressed', next ? 'true' : 'false');
  }

  function openViewer(el) {
    var group = collectGroup(el);
    vw.list = group.map(photoData);
    var idx = Math.max(0, group.indexOf(el));
    vwMenu.hidden = true;
    $('ov-viewer-more').setAttribute('aria-expanded', 'false');
    elViewer.classList.remove('is-info');
    $('ov-viewer-infobtn').setAttribute('aria-pressed', 'false');
    openLayer(elViewer, function () {
      renderPhoto(idx, 0);
      var run = function () { flipRun(1); };
      if (vwImg.complete && vwImg.naturalWidth) { raf(run); }
      else { vwImg.addEventListener('load', function () { raf(run); }, { once: true }); }
    });
  }

  function closeViewer() {
    var d = vw.list[vw.i];
    var done = function () {
      vw.list.forEach(function (x) { if (x.el) { x.el.classList.remove('ov-src-hidden'); } });
      vwImg.removeAttribute('src');
    };
    if (d && d.el && !reduced()) {
      var r = d.el.getBoundingClientRect();
      if ((r.bottom < 0 || r.top > window.innerHeight) && d.el.scrollIntoView) {
        d.el.scrollIntoView({ block: 'center' });
      }
      flipRun(-1);
      vwImg.classList.remove('is-ready');
    }
    closeLayer(elViewer, done);
  }

  function viewerKey(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); renderPhoto(vw.i - 1, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); renderPhoto(vw.i + 1, 1); }
    else if (e.key === 'i' || e.key === 'I') { toggleInfo(); }
  }

  $('ov-viewer-close').addEventListener('click', closeViewer);
  $('ov-viewer-prev').addEventListener('click', function () { renderPhoto(vw.i - 1, -1); });
  $('ov-viewer-next').addEventListener('click', function () { renderPhoto(vw.i + 1, 1); });
  $('ov-viewer-infobtn').addEventListener('click', function () { toggleInfo(); });
  $('ov-viewer-scrim').addEventListener('click', closeViewer);
  $('ov-viewer-fav').addEventListener('click', function () {
    var on = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.classList.toggle('is-on', on);
  });
  $('ov-viewer-album').addEventListener('click', function () {
    $('ov-viewer-caption').innerHTML = '<span class="ov-viewer__caption-t">已加入相簿「值得留着」</span>';
  });
  $('ov-viewer-more').addEventListener('click', function (e) {
    e.stopPropagation();
    var open = vwMenu.hidden;
    vwMenu.hidden = !open;
    vwMenu.style.top = '56px';
    vwMenu.style.right = 'var(--space-5)';
    this.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  vwMenu.addEventListener('click', function (e) {
    var it = e.target.closest('[data-ov-act]');
    if (!it) { return; }
    var act = it.getAttribute('data-ov-act');
    var msg = act === 'cover' ? '已设为「' + vw.list[vw.i].group + '」的群封面'
      : act === 'hide' ? '已从策展里隐藏，图库里仍然保留'
      : '已移到最近删除，30 天内可以恢复';
    $('ov-viewer-caption').innerHTML = '<span class="ov-viewer__caption-t">' + esc(msg) + '</span>';
    vwMenu.hidden = true;
    $('ov-viewer-more').setAttribute('aria-expanded', 'false');
  });
  vwFilm.addEventListener('click', function (e) {
    var it = e.target.closest('[data-ov-film]');
    if (!it) { return; }
    var i = parseInt(it.getAttribute('data-ov-film'), 10);
    renderPhoto(i, i > vw.i ? 1 : -1);
  });
  $('ov-info-jump').addEventListener('click', function () {
    closeViewer();
    window.setTimeout(function () {
      var target = document.querySelector('.js-goto[data-goto="messages"]');
      if (target) { target.click(); }
      else {
        var v = document.getElementById('view-messages');
        if (v) { document.querySelectorAll('.view').forEach(function (s) { s.hidden = s !== v; }); }
      }
    }, 260);
  });
  $('ov-viewer-zoomreset').addEventListener('click', function () { setZoom(1, true); });

  vwStage.addEventListener('wheel', function (e) {
    if (!elViewer.classList.contains('is-open')) { return; }
    e.preventDefault();
    setZoom(vw.scale * (e.deltaY > 0 ? 0.9 : 1.1), false);
  }, { passive: false });

  vwImg.addEventListener('dblclick', function () { setZoom(vw.scale > 1.05 ? 1 : 2.4, true); });

  vwImg.addEventListener('pointerdown', function (e) {
    if (vw.scale <= 1.001) { return; }
    vw.drag = { x: e.clientX, y: e.clientY, tx: vw.tx, ty: vw.ty };
    elViewer.classList.add('is-dragging');
    vwImg.setPointerCapture && vwImg.setPointerCapture(e.pointerId);
  });
  vwImg.addEventListener('pointermove', function (e) {
    if (!vw.drag) { return; }
    vw.tx = vw.drag.tx + (e.clientX - vw.drag.x);
    vw.ty = vw.drag.ty + (e.clientY - vw.drag.y);
    setZoom(vw.scale, false);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
    vwImg.addEventListener(t, function () { vw.drag = null; elViewer.classList.remove('is-dragging'); });
  });

  /* =========================================================================
     5 · C 上传面板
     ========================================================================= */

  var elUpload = $('ov-upload');

  $('ov-upload-close').addEventListener('click', function () { closeLayer(elUpload); });
  elUpload.querySelector('.ov-scrim').addEventListener('click', function () { closeLayer(elUpload); });

  [].forEach.call(elUpload.querySelectorAll('[data-ov-utab]'), function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-ov-utab');
      [].forEach.call(elUpload.querySelectorAll('[data-ov-utab]'), function (b) {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      ['file', 'wx', 'sync'].forEach(function (k) { $('ov-upane-' + k).hidden = (k !== key); });
    });
  });

  /* --- 拖拽与队列 --- */
  var drop = $('ov-drop');
  var queue = $('ov-queue');
  var qList = $('ov-queue-list');
  var qDepth = 0, qItems = [], qRunning = 0, qSeq = 0;

  function typeOfName(name) {
    var n = name.toLowerCase();
    if (/\.(mp4|mov|m4v|avi)$/.test(n)) { return 'video'; }
    if (/\.(m4a|mp3|wav|aac|amr)$/.test(n)) { return 'audio'; }
    if (/\.(jpg|jpeg|png|heic|heif|gif|webp)$/.test(n)) { return 'photo'; }
    return 'file';
  }
  var Q_ICON = {
    photo: '<path d="M4 6.5h16v11H4z"/><path d="M4 15l4.5-4 3.5 3 3-2.5L20 16"/><circle cx="9" cy="9.5" r="1.4"/>',
    video: '<rect x="3.5" y="6" width="12" height="12" rx="2.5"/><path d="M15.5 11l5-2.5v7L15.5 13z"/>',
    audio: '<path d="M11 5L6.5 9H3v6h3.5L11 19z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/>',
    file:  '<path d="M6 4h7l5 5v11H6z"/><path d="M13 4v5h5"/>'
  };
  function fmtSize(b) {
    if (b > 1073741824) { return (b / 1073741824).toFixed(1) + ' GB'; }
    if (b > 1048576) { return (b / 1048576).toFixed(1) + ' MB'; }
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  }

  function enqueue(files) {
    if (!files || !files.length) { return; }
    queue.hidden = false;
    $('ov-queue-result').hidden = true;
    [].forEach.call(files, function (f) {
      var id = 'q' + (++qSeq);
      var t = typeOfName(f.name);
      var row = document.createElement('div');
      row.className = 'ov-qrow';
      row.id = 'ov-' + id;
      row.innerHTML =
        '<span class="ov-qthumb ov-qthumb--' + t + '"><svg class="ov-qthumb__svg" viewBox="0 0 24 24" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + Q_ICON[t] + '</svg></span>' +
        '<span><span class="ov-qname truncate">' + esc(f.name) + '</span>' +
        '<span class="ov-qbarwrap"><span class="ov-qbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" ' +
        'aria-valuenow="0" aria-label="' + esc(f.name) + ' 的导入进度"></span></span></span>' +
        '<span class="ov-qsize">' + fmtSize(f.size || 2400000) + '</span>' +
        '<span class="ov-qstate"><svg class="ov-qstate__svg" viewBox="0 0 24 24" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';
      qList.appendChild(row);
      qItems.push({ id: id, row: row, p: 0, done: false, name: f.name, type: t });
    });
    $('ov-queue-t').textContent = '导入队列 · ' + qItems.length + ' 项';
    pump();
  }

  function pump() {
    qItems.forEach(function (it) {
      if (it.done || it.started || qRunning >= 3) { return; }
      it.started = true;
      qRunning++;
      var bar = it.row.querySelector('.ov-qbar');
      var step = 6 + Math.random() * 10;
      var timer = window.setInterval(function () {
        it.p = Math.min(100, it.p + step);
        bar.style.width = it.p + '%';
        bar.setAttribute('aria-valuenow', String(Math.round(it.p)));
        if (it.p >= 100) {
          window.clearInterval(timer);
          it.done = true;
          it.row.classList.add('is-done');
          qRunning--;
          pump();
          checkQueueDone();
        }
      }, 180);
    });
  }

  function checkQueueDone() {
    if (!qItems.length || qItems.some(function (i) { return !i.done; })) { return; }
    var photos = qItems.filter(function (i) { return i.type === 'photo'; }).length;
    var r = $('ov-queue-result');
    r.hidden = false;
    $('ov-queue-result-t').textContent = '已导入 ' + qItems.length + ' 个文件';
    $('ov-queue-result-s').textContent = '已自动识别 3 位人物、2 个地点' +
      (photos ? '，其中 ' + photos + ' 张照片进了图库' : '');
  }

  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) {
      e.preventDefault();
      if (e.dataTransfer) { e.dataTransfer.dropEffect = 'copy'; }
      if (t === 'dragenter') { qDepth++; }
      drop.classList.add('is-over');
    });
  });
  ['dragleave', 'dragend'].forEach(function (t) {
    drop.addEventListener(t, function () {
      qDepth = Math.max(0, qDepth - 1);
      if (!qDepth) { drop.classList.remove('is-over'); }
    });
  });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    qDepth = 0;
    drop.classList.remove('is-over');
    if (e.dataTransfer) { enqueue(e.dataTransfer.files); }
  });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('ov-file-input').click(); }
  });
  $('ov-drop-pick').addEventListener('click', function (e) { e.stopPropagation(); $('ov-file-input').click(); });
  $('ov-file-input').addEventListener('change', function () { enqueue(this.files); this.value = ''; });
  $('ov-drop-demo').addEventListener('click', function (e) {
    e.stopPropagation();
    enqueue([
      { name: 'IMG_5120.HEIC', size: 4404019 }, { name: 'IMG_5121.HEIC', size: 3984588 },
      { name: '八周年长桌.jpg', size: 7130316 }, { name: '生日蜡烛.mov', size: 96468992 },
      { name: '语音 0:47.m4a', size: 369664 }, { name: '这几年的账单.pdf', size: 1258291 }
    ]);
  });
  $('ov-queue-clear').addEventListener('click', function () {
    qItems = []; qRunning = 0; qList.innerHTML = '';
    queue.hidden = true;
    $('ov-queue-result').hidden = true;
  });

  /* --- 微信导入分步 --- */
  var wxStep = 0;
  var wxSel = { '老友记 · 永不解散': true };
  var wxRange = { from: 2017, to: 2025 };

  function wxGo(n) {
    wxStep = n;
    [0, 1, 2, 3, 4].forEach(function (i) { $('ov-wx-' + i).hidden = (i !== n); });
    [].forEach.call($('ov-steps').querySelectorAll('.ov-step'), function (s, i) {
      s.classList.toggle('is-cur', i === n);
      s.classList.toggle('is-done', i < n);
    });
    if (n === 2) { wxParse(); }
    if (n === 3) { wxTasks(); }
  }

  function wxSum() {
    var msgs = 0, gb = 0, cnt = 0;
    [].forEach.call(elUpload.querySelectorAll('[data-ov-group]'), function (row) {
      if (row.getAttribute('aria-checked') !== 'true') { return; }
      cnt++;
      msgs += parseInt(row.getAttribute('data-ov-msgs'), 10);
      gb += parseFloat(row.getAttribute('data-ov-gb'));
    });
    $('ov-wx-sum').textContent = cnt
      ? '已选 ' + cnt + ' 个群 · ' + num(msgs) + ' 条消息 · 预计占用 ' + gb.toFixed(1) + ' GB'
      : '还没选群，选中的才会被读取';
    $('ov-wx-next-0').disabled = !cnt;
  }

  [].forEach.call(elUpload.querySelectorAll('[data-ov-group]'), function (row) {
    row.addEventListener('click', function () {
      var on = row.getAttribute('aria-checked') === 'true';
      row.setAttribute('aria-checked', on ? 'false' : 'true');
      wxSel[row.getAttribute('data-ov-group')] = !on;
      wxSum();
    });
  });

  function buildHist() {
    var max = Math.max.apply(null, YEARS_MSG.map(function (r) { return r.m; }));
    $('ov-hist').innerHTML = YEARS_MSG.map(function (r) {
      return '<button type="button" class="ov-hist__col is-in" data-ov-year="' + r.y + '" ' +
        'aria-label="' + r.y + ' 年 ' + num(r.m) + ' 条消息">' +
        '<span class="ov-hist__bar" style="height: ' + Math.round(r.m / max * 84) + '%"></span>' +
        '<span class="ov-hist__y">' + String(r.y).slice(2) + '</span></button>';
    }).join('');
  }

  function wxRangeSum() {
    var msgs = 0, photos = 0;
    YEARS_MSG.forEach(function (r) {
      if (r.y >= wxRange.from && r.y <= wxRange.to) { msgs += r.m; photos += r.p; }
    });
    $('ov-wx-range-sum').textContent = '将导入 ' + num(msgs) + ' 条消息 · ' + num(photos) + ' 张照片（' +
      wxRange.from + '—' + wxRange.to + '）';
    [].forEach.call($('ov-hist').querySelectorAll('[data-ov-year]'), function (c) {
      var y = parseInt(c.getAttribute('data-ov-year'), 10);
      c.classList.toggle('is-in', y >= wxRange.from && y <= wxRange.to);
    });
  }

  var wxPickState = 0;
  $('ov-hist').addEventListener('click', function (e) {
    var col = e.target.closest('[data-ov-year]');
    if (!col) { return; }
    var y = parseInt(col.getAttribute('data-ov-year'), 10);
    if (wxPickState === 0) { wxRange.from = y; wxRange.to = y; wxPickState = 1; }
    else { wxRange.from = Math.min(wxRange.from, y); wxRange.to = Math.max(wxRange.to, y); wxPickState = 0; }
    [].forEach.call(elUpload.querySelectorAll('[data-ov-range]'), function (c) { c.classList.remove('is-on'); });
    wxRangeSum();
  });
  [].forEach.call(elUpload.querySelectorAll('[data-ov-range]'), function (chip) {
    chip.addEventListener('click', function () {
      var v = chip.getAttribute('data-ov-range');
      if (v === 'all') { wxRange = { from: 2017, to: 2025 }; }
      else if (v === '3') { wxRange = { from: 2023, to: 2025 }; }
      else { wxRange = { from: 2019, to: 2019 }; }
      wxPickState = 0;
      [].forEach.call(elUpload.querySelectorAll('[data-ov-range]'), function (c) { c.classList.toggle('is-on', c === chip); });
      wxRangeSum();
    });
  });

  var PARSE_LOG = [
    '正在读取备份索引…',
    '正在解析 2017 年 9 月 — 12 月…',
    '已提取 612 张图片、48 条语音',
    '正在解析 2019 年 6 月 — 8 月…',
    '已提取 2,306 张图片、1,204 条语音',
    '正在还原引用、@ 与撤回记录…',
    '正在解析 2023 年 10 月…',
    '已提取 1,724 张图片、38 段视频',
    '正在核对重复文件，跳过 214 张…',
    '解析完成，共 38,204 条消息'
  ];
  var parseTimer = 0;
  function wxParse() {
    var p = 0, li = 0;
    var bar = $('ov-parse-bar');
    var log = $('ov-parse-log');
    log.innerHTML = '';
    bar.style.strokeDashoffset = '163.36';
    window.clearInterval(parseTimer);
    parseTimer = window.setInterval(function () {
      p = Math.min(100, p + 4 + Math.random() * 5);
      bar.style.strokeDashoffset = String(163.36 * (1 - p / 100));
      $('ov-parse-t').textContent = '正在解析聊天记录 · ' + Math.round(p) + '%';
      var want = Math.min(PARSE_LOG.length, Math.ceil(p / 100 * PARSE_LOG.length));
      while (li < want) {
        var line = document.createElement('p');
        line.className = 'ov-log__line';
        line.textContent = PARSE_LOG[li++];
        log.appendChild(line);
        while (log.children.length > 3) { log.removeChild(log.firstChild); }
      }
      if (p >= 100) {
        window.clearInterval(parseTimer);
        $('ov-parse-t').textContent = '解析完成 · 38,204 条消息';
        window.setTimeout(function () { if (wxStep === 2) { wxGo(3); } }, 900);
      }
    }, 420);
  }

  var TASKS = [
    { n: '识别人物', d: 2600 }, { n: '判断地点', d: 3200 }, { n: '挑选精选', d: 3800 },
    { n: '归拢旅程', d: 4600 }, { n: '剪回忆', d: 5600 }
  ];
  function wxTasks() {
    var box = $('ov-tasks');
    box.innerHTML = TASKS.map(function (t, i) {
      return '<div class="ov-task" data-ov-task="' + i + '">' +
        '<svg class="ov-ring ov-ring--sm" viewBox="0 0 60 60" role="progressbar" aria-valuemin="0" aria-valuemax="100" ' +
        'aria-valuenow="0" aria-label="' + t.n + '"><circle class="ov-ring__track" cx="30" cy="30" r="26"></circle>' +
        '<circle class="ov-ring__bar" cx="30" cy="30" r="26"></circle></svg>' +
        '<span class="ov-task__n">' + t.n + '</span></div>';
    }).join('');
    TASKS.forEach(function (t, i) {
      var el = box.querySelector('[data-ov-task="' + i + '"]');
      var ring = el.querySelector('.ov-ring');
      var bar = el.querySelector('.ov-ring__bar');
      var p = 0;
      var iv = window.setInterval(function () {
        p = Math.min(100, p + 100 / (t.d / 260));
        bar.style.strokeDashoffset = String(163.36 * (1 - p / 100));
        ring.setAttribute('aria-valuenow', String(Math.round(p)));
        if (p >= 100) {
          window.clearInterval(iv);
          ring.classList.add('is-done');
          el.classList.add('is-done');
          if (i === TASKS.length - 1) {
            window.setTimeout(function () { if (wxStep === 3) { wxGo(4); } }, 700);
          }
        }
      }, 260);
    });
  }

  $('ov-wx-next-0').addEventListener('click', function () { wxGo(1); });
  $('ov-wx-back-1').addEventListener('click', function () { wxGo(0); });
  $('ov-wx-next-1').addEventListener('click', function () { wxGo(2); });
  $('ov-wx-again').addEventListener('click', function () { wxGo(0); });

  /* --- 相册同步 --- */
  $('ov-sync-now').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    var left = 1206;
    $('ov-sync-state').textContent = '正在同步…';
    var iv = window.setInterval(function () {
      left = Math.max(0, left - 137);
      $('ov-sync-state').textContent = left ? '还剩 ' + num(left) + ' 张' : '同步完成 · 新增 1,206 张照片';
      if (!left) { window.clearInterval(iv); btn.disabled = false; }
    }, 380);
  });

  /* --- 存储条 hover --- */
  var storBar = $('ov-stor-bar');
  storBar.addEventListener('pointerover', function (e) {
    var seg = e.target.closest('[data-ov-seg]');
    if (!seg) { return; }
    storBar.classList.add('is-hover');
    [].forEach.call(storBar.children, function (c) { c.classList.toggle('is-hot', c === seg); });
  });
  storBar.addEventListener('pointerleave', function () {
    storBar.classList.remove('is-hover');
    [].forEach.call(storBar.children, function (c) { c.classList.remove('is-hot'); });
  });

  /* 全局开关 */
  root.addEventListener('click', function (e) {
    var sw = e.target.closest('.ov-switch');
    if (!sw) { return; }
    sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
  });

  /* =========================================================================
     6 · D 管理面板
     ========================================================================= */

  var elManage = $('ov-manage');
  var tbody = $('ov-tbody');
  var bulk = $('ov-bulk');
  var tagMenu = $('ov-tagmenu');
  var sortKey = 'date', sortDir = -1;
  var filters = { type: null, group: null, year: null, q: '' };
  var selected = {};

  var M_TITLES = { lib: '素材库', people: '人物', albums: '相簿', src: '群与来源', tags: '标签', storage: '存储', privacy: '隐私' };

  $('ov-manage-close').addEventListener('click', function () { closeLayer(elManage); });
  $('ov-manage-scrim').addEventListener('click', function () { closeLayer(elManage); });

  [].forEach.call(elManage.querySelectorAll('[data-ov-mtab]'), function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-ov-mtab');
      [].forEach.call(elManage.querySelectorAll('[data-ov-mtab]'), function (b) {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      Object.keys(M_TITLES).forEach(function (k) { $('ov-mpane-' + k).hidden = (k !== key); });
      $('ov-mtop-t').textContent = M_TITLES[key];
      $('ov-mbody').scrollTop = 0;
      bulk.classList.toggle('is-up', key === 'lib' && Object.keys(selected).length > 0);
    });
  });

  function rows() {
    return MEDIA.filter(function (r) {
      if (filters.type && r.type !== filters.type) { return false; }
      if (filters.group && r.group !== filters.group) { return false; }
      if (filters.year && r.date.slice(0, 4) !== filters.year) { return false; }
      if (filters.q) {
        var q = filters.q.toLowerCase();
        var hay = (r.name + r.sum + r.sender + r.group + r.tags.join('')).toLowerCase();
        if (hay.indexOf(q) < 0) { return false; }
      }
      return true;
    }).sort(function (a, b) {
      var x = a[sortKey === 'size' ? 'bytes' : sortKey];
      var y = b[sortKey === 'size' ? 'bytes' : sortKey];
      if (typeof x === 'string') { return x.localeCompare(y, 'zh-Hans-CN') * sortDir; }
      return (x - y) * sortDir;
    });
  }

  function renderTable() {
    var list = rows();
    $('ov-tbl-count').textContent = list.length + ' 项';
    tbody.innerHTML = list.map(function (r) {
      var id = r.name;
      var sel = !!selected[id];
      var thumb = r.thumb
        ? '<img class="ov-tthumb" src="' + r.thumb + '" alt="' + esc(r.sum) + '" loading="lazy" decoding="async">'
        : '<span class="ov-qthumb ov-qthumb--' + r.type + '"><svg class="ov-qthumb__svg" viewBox="0 0 24 24" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (Q_ICON[r.type] || Q_ICON.file) + '</svg></span>';
      return '<div class="ov-tr" role="row" data-ov-row="' + esc(id) + '" aria-selected="' + sel + '" tabindex="0">' +
        '<span class="ov-check"><svg class="ov-check__svg" viewBox="0 0 24 24" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
        thumb +
        '<span class="ov-td ov-td--name"><span class="truncate">' + esc(r.name) + '</span>' +
        '<span class="ov-tsrc__p truncate">' + esc(r.sum) + '</span></span>' +
        '<span class="ov-td"><span class="ov-tpill ov-tpill--' + r.type + '">' + TYPE_LABEL[r.type] + '</span></span>' +
        '<span class="ov-td truncate">' + esc(r.group) + '</span>' +
        '<span class="ov-td">' + esc(r.sender) + '</span>' +
        '<span class="ov-td tnum">' + r.date.replace(/-/g, '.') + '</span>' +
        '<span class="ov-td ov-td--num">' + esc(r.size) + '</span>' +
        '<span class="ov-td ov-tags-cell">' + (r.tags.length
          ? r.tags.map(function (t) { return '<span class="ov-tag">' + esc(t) + '</span>'; }).join('')
          : '<span class="ov-tsrc__p">—</span>') + '</span>' +
        '<span class="ov-td ov-td--num">' + (r.starred ? '★' : '') + '</span>' +
        '</div>';
    }).join('');
    syncBulk();
  }

  function syncBulk() {
    var n = Object.keys(selected).length;
    $('ov-bulk-n').textContent = '已选 ' + n + ' 项';
    bulk.classList.toggle('is-up', n > 0 && !$('ov-mpane-lib').hidden);
    $('ov-tbl-all').setAttribute('aria-checked', n && n === rows().length ? 'true' : 'false');
  }

  tbody.addEventListener('click', function (e) {
    var row = e.target.closest('[data-ov-row]');
    if (!row) { return; }
    var id = row.getAttribute('data-ov-row');
    if (selected[id]) { delete selected[id]; } else { selected[id] = true; }
    row.setAttribute('aria-selected', selected[id] ? 'true' : 'false');
    syncBulk();
  });
  tbody.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') { return; }
    var row = e.target.closest('[data-ov-row]');
    if (!row) { return; }
    e.preventDefault();
    row.click();
  });
  $('ov-tbl-all').addEventListener('click', function () {
    var all = this.getAttribute('aria-checked') === 'true';
    selected = {};
    if (!all) { rows().forEach(function (r) { selected[r.name] = true; }); }
    renderTable();
  });
  $('ov-bulk-cancel').addEventListener('click', function () { selected = {}; renderTable(); });

  [].forEach.call(elManage.querySelectorAll('[data-ov-filter]'), function (chip) {
    chip.addEventListener('click', function () {
      var k = chip.getAttribute('data-ov-filter');
      var v = chip.getAttribute('data-ov-val');
      var on = filters[k] === v;
      filters[k] = on ? null : v;
      [].forEach.call(elManage.querySelectorAll('[data-ov-filter="' + k + '"]'), function (c) {
        c.classList.toggle('is-on', !on && c === chip);
      });
      selected = {};
      renderTable();
    });
  });
  $('ov-msearch').addEventListener('input', function () {
    filters.q = this.value.trim();
    renderTable();
  });

  [].forEach.call(elManage.querySelectorAll('[data-ov-sort]'), function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-ov-sort');
      if (sortKey === k) { sortDir = -sortDir; } else { sortKey = k; sortDir = 1; }
      [].forEach.call(elManage.querySelectorAll('[data-ov-sort]'), function (t) {
        t.setAttribute('aria-sort', t === th ? (sortDir > 0 ? 'ascending' : 'descending') : 'none');
      });
      renderTable();
    });
  });

  $('ov-bulk-tag').addEventListener('click', function (e) {
    e.stopPropagation();
    var r = this.getBoundingClientRect();
    if (!tagMenu.hidden) { tagMenu.hidden = true; return; }
    tagMenu.hidden = false;
    tagMenu.style.left = r.left + 'px';
    tagMenu.style.top = Math.max(12, r.top - tagMenu.offsetHeight - 10) + 'px';
  });
  tagMenu.addEventListener('click', function (e) {
    var it = e.target.closest('[data-ov-tag]');
    if (!it) { return; }
    var tag = it.getAttribute('data-ov-tag');
    if (tag === '新标签') { tag = '值得留着'; }
    MEDIA.forEach(function (r) {
      if (selected[r.name] && r.tags.indexOf(tag) < 0) { r.tags.push(tag); }
    });
    tagMenu.hidden = true;
    $('ov-bulk-hint').textContent = '已给 ' + Object.keys(selected).length + ' 项加上「' + tag + '」';
    renderTable();
  });
  $('ov-bulk-star').addEventListener('click', function () {
    MEDIA.forEach(function (r) { if (selected[r.name]) { r.starred = true; } });
    $('ov-bulk-hint').textContent = '已把 ' + Object.keys(selected).length + ' 项设为精选';
    renderTable();
  });
  $('ov-bulk-hide').addEventListener('click', function () {
    $('ov-bulk-hint').textContent = '已隐藏 ' + Object.keys(selected).length + ' 项，图库里仍然保留';
  });
  $('ov-bulk-del').addEventListener('click', function () {
    var n = Object.keys(selected).length;
    for (var i = MEDIA.length - 1; i >= 0; i--) { if (selected[MEDIA[i].name]) { MEDIA.splice(i, 1); } }
    selected = {};
    $('ov-bulk-hint').textContent = '已把 ' + n + ' 项移到最近删除，30 天内可以恢复';
    renderTable();
  });
  document.addEventListener('click', function (e) {
    if (!tagMenu.hidden && !e.target.closest('#ov-tagmenu') && !e.target.closest('#ov-bulk-tag')) { tagMenu.hidden = true; }
    if (!vwMenu.hidden && !e.target.closest('#ov-viewer-menu') && !e.target.closest('#ov-viewer-more')) {
      vwMenu.hidden = true;
      $('ov-viewer-more').setAttribute('aria-expanded', 'false');
    }
  });

  /* --- 人脸簇 --- */
  var CLUSTERS = PEOPLE.map(function (p) {
    return { name: p.n, cover: faceOf(p.n), count: p.c, span: '2017—2025', state: 'named' };
  }).concat([
    { name: '', cover: 'assets/photos/p040.jpg', count: 68, span: '2019—2023', state: 'unnamed' },
    { name: '', cover: 'assets/photos/p045.jpg', count: 42, span: '2018—2021', state: 'unnamed' },
    { name: '', cover: 'assets/photos/p046.jpg', count: 31, span: '2021—2025', state: 'unnamed' },
    { name: '', cover: 'assets/photos/p047.jpg', count: 26, span: '2017—2019', state: 'unnamed' },
    { name: '', cover: 'assets/photos/p057.jpg', count: 18, span: '2022—2024', state: 'unnamed' },
    { name: '', cover: 'assets/photos/p053.jpg', count: 12, span: '2020—2020', state: 'unnamed' }
  ]);

  function renderFaces() {
    var list = CLUSTERS.filter(function (c) { return c.state !== 'ignored'; })
      .sort(function (a, b) {
        if (a.state !== b.state) { return a.state === 'unnamed' ? -1 : 1; }
        return b.count - a.count;
      });
    $('ov-faces').innerHTML = list.map(function (c, i) {
      return '<div class="ov-face" data-ov-face="' + i + '">' +
        '<img class="ov-face__img" src="' + c.cover + '" alt="' + esc(c.name || '未命名人脸簇') + '的代表照片" loading="lazy" decoding="async">' +
        '<p class="ov-face__name' + (c.name ? '' : ' is-unnamed') + '">' + esc(c.name || '未命名') + '</p>' +
        '<p class="ov-face__meta">' + num(c.count) + ' 张 · ' + c.span + '</p>' +
        '<div class="ov-face__acts">' +
        '<button type="button" class="ov-face__act" data-ov-face-act="name">命名</button>' +
        '<button type="button" class="ov-face__act" data-ov-face-act="merge">合并</button>' +
        '<button type="button" class="ov-face__act" data-ov-face-act="ignore">忽略</button>' +
        '</div></div>';
    }).join('');
    $('ov-faces-foot').textContent = '共 ' + list.length + ' 组人脸，其中 ' +
      list.filter(function (c) { return c.state === 'unnamed'; }).length +
      ' 组还没命名；另有 6 组已忽略，多为海报与路人。';
    CLUSTERS.__view = list;
  }

  $('ov-faces').addEventListener('click', function (e) {
    var act = e.target.closest('[data-ov-face-act]');
    var card = e.target.closest('[data-ov-face]');
    if (!card) { return; }
    var c = CLUSTERS.__view[parseInt(card.getAttribute('data-ov-face'), 10)];
    if (!act) {
      if (c.name) { openDetail('person', c.name); }
      return;
    }
    var kind = act.getAttribute('data-ov-face-act');
    if (kind === 'ignore') { c.state = 'ignored'; renderFaces(); return; }
    if (kind === 'merge') {
      $('ov-faces-foot').textContent = '选中另一组人脸，或在建议条里确认合并。合并会影响 ' + num(c.count) + ' 张照片的归类。';
      return;
    }
    var nameEl = card.querySelector('.ov-face__name');
    var input = document.createElement('input');
    input.className = 'ov-face__input';
    input.value = c.name;
    input.setAttribute('aria-label', '给这组人脸命名');
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    var commit = function (save) {
      if (save && input.value.trim()) { c.name = input.value.trim(); c.state = 'named'; }
      renderFaces();
    };
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); commit(false); }
    });
    input.addEventListener('blur', function () { commit(true); });
  });

  $('ov-suggest-yes').addEventListener('click', function () {
    var idx = CLUSTERS.findIndex(function (c) { return c.state === 'unnamed'; });
    if (idx > -1) {
      var merged = CLUSTERS.splice(idx, 1)[0];
      var target = CLUSTERS.filter(function (c) { return c.name === '苏念'; })[0];
      if (target) { target.count += merged.count; }
    }
    $('ov-suggest').hidden = true;
    renderFaces();
  });
  $('ov-suggest-no').addEventListener('click', function () { $('ov-suggest').hidden = true; });

  /* --- 存储：按年份用量 --- */
  function renderYears() {
    var max = Math.max.apply(null, YEARS_MSG.map(function (r) { return r.gb; }));
    $('ov-years').innerHTML = YEARS_MSG.map(function (r) {
      return '<div class="ov-years__col" title="' + r.y + ' 年新增 ' + r.gb.toFixed(1) + ' GB">' +
        '<span class="ov-years__bar" style="height: ' + Math.round(r.gb / max * 88) + '%"></span>' +
        '<span class="ov-years__y">' + String(r.y).slice(2) + '</span></div>';
    }).join('');
  }

  [].forEach.call(elManage.querySelectorAll('[data-ov-clean]'), function (btn) {
    btn.addEventListener('click', function () {
      btn.textContent = '已清理';
      btn.disabled = true;
    });
  });

  /* =========================================================================
     7 · E 人物详情 / 旅程详情
     ========================================================================= */

  var elDetail = $('ov-detail');
  var dScroll = $('ov-detail-scroll');

  $('ov-detail-close').addEventListener('click', function () { closeLayer(elDetail); });

  function tile(src, cap, extra) {
    var m = metaOf(src);
    return '<button type="button" class="ov-dtile' + (extra || '') + ' js-photo" data-photo="' + src +
      '" data-caption="' + esc(cap) + '" data-date="' + m.date + '" data-place="' + m.place +
      '" data-group="' + GROUP_MAIN + '">' +
      '<img class="ov-dtile__img" src="' + src + '" alt="' + esc(cap) + '" loading="lazy" decoding="async"></button>';
  }

  function personHTML(name) {
    var p = PEOPLE_BY_NAME[name] || { n: name, f: 'u01', c: 214, city: '杭州', role: '' };
    var pool = [];
    for (var i = 0; i < 12; i++) {
      pool.push(PHOTOS[hash(name + i) % PHOTOS.length]);
    }
    var others = PEOPLE.filter(function (x) { return x.n !== name; }).slice(0, 6);
    var mems = [
      { t: '和' + name + '的那些年', s: '2017—2025 · 从 ' + num(p.c) + ' 张里挑了 74 张', ph: pool.slice(0, 8) },
      { t: name + '的每一个生日', s: '8 段 · 1 分 52 秒', ph: pool.slice(2, 10) },
      { t: '一起吃过的饭', s: '跨八年 · 231 顿 · 1,106 张', ph: pool.slice(4, 12) }
    ];

    return '' +
    '<header class="ov-dhero">' +
      '<span class="ov-dhero__bg" aria-hidden="true"><img class="ov-dhero__bg-img" src="' + pool[0] + '" alt="" decoding="async"></span>' +
      '<span class="ov-dhero__scrim" aria-hidden="true"></span>' +
      '<div class="ov-dhero__in">' +
        '<img class="ov-dhero__face" src="' + faceOf(name) + '" alt="' + esc(name) + ' 的头像" decoding="async">' +
        '<div>' +
          '<p class="ov-dhero__kicker">人物</p>' +
          '<h2 class="ov-dhero__name">' + esc(name) + '</h2>' +
          '<p class="ov-dhero__sub">' + (p.role ? esc(p.role) + ' · ' : '') + '常住' + esc(p.city) +
            ' · 2017年9月6日 至 昨天</p>' +
          '<div class="ov-dhero__stats">' +
            '<div><p class="ov-dstat__n">' + num(p.c) + '</p><p class="ov-dstat__k">张出镜</p></div>' +
            '<div><p class="ov-dstat__n">' + num(Math.round(p.c * 12.4)) + '</p><p class="ov-dstat__k">条发言</p></div>' +
            '<div><p class="ov-dstat__n">' + (6 + p.c % 7) + '</p><p class="ov-dstat__k">段一起去的旅程</p></div>' +
            '<div><p class="ov-dstat__n">' + (4 + p.c % 6) + '</p><p class="ov-dstat__k">座去过的城市</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="ov-dhero__acts">' +
          '<button type="button" class="ov-btn ov-btn--lg ov-btn--pill js-memory" data-memory-title="和' + esc(name) +
            '的那些年" data-memory-sub="2017—2025 · 从 ' + num(p.c) + ' 张里挑了 74 张" data-memory-photos="' +
            pool.slice(0, 8).join('|') + '">播放这个人的回忆</button>' +
        '</div>' +
      '</div>' +
    '</header>' +

    '<div class="ov-dbody">' +
      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">为' + esc(name) + '生成的回忆</p>' +
        '<p class="ov-dsec__s">三段已经剪好的，点开就能看</p></div></div>' +
        '<div class="ov-dcols">' + mems.map(function (m) {
          return '<button type="button" class="ov-dcard js-memory" data-memory-title="' + esc(m.t) +
            '" data-memory-sub="' + esc(m.s) + '" data-memory-photos="' + m.ph.join('|') + '">' +
            '<p class="ov-dcard__k">回忆</p><p class="ov-dcard__v">' + esc(m.t) + '</p>' +
            '<p class="ov-dcard__n">' + esc(m.s) + '</p></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">常在一起的人</p>' +
        '<p class="ov-dsec__s">按同框次数排</p></div></div>' +
        '<div class="ov-dpeople">' + others.map(function (o, i) {
          return '<button type="button" class="ov-dperson js-person" data-person="' + esc(o.n) + '">' +
            '<img class="ov-dperson__img" src="' + faceOf(o.n) + '" alt="' + esc(o.n) + ' 的头像" loading="lazy" decoding="async">' +
            '<span class="ov-dperson__n">' + esc(o.n) + '</span>' +
            '<span class="ov-dperson__m">同框 ' + num(Math.round(p.c / (1.4 + i * 0.42))) + ' 次</span></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">出镜的照片</p>' +
        '<p class="ov-dsec__s">按时间倒序，先给最近两年</p></div>' +
        '<button type="button" class="ov-btn js-goto" data-goto="library">在图库里看全部</button></div>' +
        '<div class="ov-dgrid">' + pool.map(function (src, i) {
          return tile(src, name + ' 出镜的第 ' + (i + 1) + ' 张照片', i === 0 ? ' ov-dtile--wide' : '');
        }).join('') + '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">' + esc(name) + '说过的</p>' +
        '<p class="ov-dsec__s">从 ' + num(Math.round(p.c * 12.4)) + ' 条发言里挑出来的</p></div></div>' +
        '<div class="ov-dcols">' +
          '<div class="ov-dcard"><p class="ov-dcard__k">最常说的话</p><div class="ov-dwords">' +
            '<span class="ov-dword" style="font-size: 26px">行</span>' +
            '<span class="ov-dword" style="font-size: 19px">我在路上了</span>' +
            '<span class="ov-dword" style="font-size: 22px">随便你们</span>' +
            '<span class="ov-dword" style="font-size: 16px">这个我来</span>' +
            '<span class="ov-dword" style="font-size: 18px">再睡五分钟</span>' +
            '<span class="ov-dword" style="font-size: 15px">图我发群里了</span></div></div>' +
          '<div class="ov-dcard"><p class="ov-dcard__k">被回复最多的一条</p>' +
            '<p class="ov-dcard__v">「船票买到了，五点集合」</p>' +
            '<p class="ov-dcard__n">2021年7月16日 04:47 · 被 14 个人回复</p></div>' +
          '<div class="ov-dcard"><p class="ov-dcard__k">最长的一条语音</p>' +
            '<p class="ov-dcard__v">3 分 08 秒</p>' +
            '<p class="ov-dcard__n">2021年6月24日 23:51 · 转写已可搜索</p></div>' +
        '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">出现最多的群和地点</p></div></div>' +
        '<div class="ov-dcols">' +
          '<div class="ov-dcard"><p class="ov-dcard__k">群</p><p class="ov-dcard__v">' + GROUP_MAIN + '</p>' +
            '<p class="ov-dcard__n">' + num(Math.round(p.c * 0.78)) + ' 张出自这里</p></div>' +
          '<div class="ov-dcard"><p class="ov-dcard__k">地点</p><p class="ov-dcard__v">' + esc(p.city) + ' · 滨江</p>' +
            '<p class="ov-dcard__n">' + num(Math.round(p.c * 0.36)) + ' 张 · 2021 年之后大多在这儿</p></div>' +
          '<div class="ov-dcard"><p class="ov-dcard__k">一起去过最多次的地方</p><p class="ov-dcard__v">莫干山</p>' +
            '<p class="ov-dcard__n">4 次 · 最近一次 2025年8月23日</p></div>' +
        '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="row row-wrap" style="--row-gap: var(--space-5)">' +
          '<button type="button" class="ov-btn ov-btn--quiet">合并到其他人物</button>' +
          '<button type="button" class="ov-btn ov-btn--quiet">这不是同一个人</button>' +
          '<button type="button" class="ov-btn ov-btn--quiet">不在人物里显示</button>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  function tripHTML(name) {
    var t = tripOf(name);
    var title = name.split(' · ')[0];
    var pool = t.pool.map(function (k) { return 'assets/photos/' + k + '.jpg'; });
    var perDay = Math.ceil(pool.length / Math.min(4, t.days));
    var dayCount = Math.min(4, t.days);

    var days = '';
    for (var d = 0; d < dayCount; d++) {
      var seg = pool.slice(d * perDay, (d + 1) * perDay);
      if (!seg.length) { break; }
      days += '<section class="ov-dday">' +
        '<div class="ov-dday__head"><p class="ov-dday__t">第' + ['一', '二', '三', '四'][d] + '天</p>' +
        '<p class="ov-dday__s">' + esc(t.route[Math.min(d, t.route.length - 1)].d) + ' · ' +
        esc(t.route[Math.min(d, t.route.length - 1)].n) + '</p></div>' +
        '<div class="ov-dgrid">' + seg.map(function (src, i) {
          return tile(src, title + '第' + ['一', '二', '三', '四'][d] + '天的第 ' + (i + 1) + ' 张照片',
            i === 0 ? ' ov-dtile--wide' : '');
        }).join('') + '</div>' +
        '<p class="ov-dday__foot">' + esc(t.notes[d] || '这一天 62 张') + '</p></section>';
    }

    var route = '';
    t.route.forEach(function (n, i) {
      route += '<div class="ov-route__node"><img class="ov-route__thumb" src="' + n.t + '" alt="' +
        esc(n.n) + ' 的照片" loading="lazy" decoding="async">' +
        '<span class="ov-route__dot" aria-hidden="true"></span>' +
        '<span class="ov-route__n">' + esc(n.n) + '</span><span class="ov-route__d">' + esc(n.d) + '</span></div>';
      if (i < t.route.length - 1) {
        route += '<div class="ov-route__link" aria-hidden="true"><span class="ov-route__line"></span>' +
          '<span class="ov-route__meta">' + esc(t.legs[i] || '') + '</span></div>';
      }
    });

    var pins = t.route.map(function (n, i) {
      var x = 60 + i * (560 / Math.max(1, t.route.length - 1));
      var y = 170 - i * 26 + (i % 2 ? 18 : -12);
      return { x: x, y: y, n: n.n };
    });
    var path = 'M' + pins.map(function (p) { return p.x.toFixed(0) + ' ' + p.y.toFixed(0); }).join(' L');

    return '' +
    '<header class="ov-dhero ov-dhero--trip">' +
      '<span class="ov-dhero__bg" aria-hidden="true"><img class="ov-dhero__bg-img ken-burns" src="' + t.cover +
        '" alt="" decoding="async"></span>' +
      '<span class="ov-dhero__scrim" aria-hidden="true"></span>' +
      '<div class="ov-dhero__in">' +
        '<div>' +
          '<p class="ov-dhero__kicker">旅程</p>' +
          '<h2 class="ov-dhero__name">' + esc(title) + '</h2>' +
          '<p class="ov-dhero__sub">' + esc(t.range) + ' · ' + t.days + ' 天 · ' + t.who.length + ' 人 · ' +
            num(t.count) + ' 张照片</p>' +
          '<div class="ov-dhero__stats">' +
            '<div><p class="ov-dstat__n">' + num(t.count) + '</p><p class="ov-dstat__k">张照片</p></div>' +
            '<div><p class="ov-dstat__n">' + (t.days * 9 + 11) + '</p><p class="ov-dstat__k">段视频</p></div>' +
            '<div><p class="ov-dstat__n">' + t.route.length + '</p><p class="ov-dstat__k">个落脚点</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="ov-dhero__acts">' +
          '<button type="button" class="ov-btn ov-btn--lg ov-btn--primary ov-btn--pill js-memory" data-memory-title="' +
            esc(title) + '的' + ['', '一天', '两天', '三天', '四天', '五天', '六天', '七天'][t.days] +
            '" data-memory-sub="' + esc(t.range) + ' · ' + num(t.count) + ' 张" data-memory-photos="' +
            pool.slice(0, 10).join('|') + '">播放回忆</button>' +
        '</div>' +
      '</div>' +
    '</header>' +

    '<div class="ov-dbody">' +
      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">路线</p>' +
        '<p class="ov-dsec__s">点一个节点，跳到那一天</p></div></div>' +
        '<div class="ov-route">' + route + '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">在地图上看</p>' +
        '<p class="ov-dsec__s">有定位信息的 ' + num(Math.round(t.count * 0.72)) + ' 张照片落在这条线上</p></div></div>' +
        '<div class="ov-dmap"><svg class="ov-dmap__svg" viewBox="0 0 680 240" role="img" aria-label="' +
          esc(title) + ' 的路线示意图">' +
          '<g aria-hidden="true">' +
            '<path class="ov-dmap__grid" d="M0 60H680M0 120H680M0 180H680"/>' +
            '<path class="ov-dmap__grid" d="M120 0V240M280 0V240M440 0V240M600 0V240"/>' +
          '</g>' +
          '<path class="ov-dmap__path" d="' + path + '"/>' +
          pins.map(function (p) {
            return '<circle class="ov-dmap__pin" cx="' + p.x.toFixed(0) + '" cy="' + p.y.toFixed(0) + '" r="5"/>' +
              '<text class="ov-dmap__label" x="' + (p.x + 10).toFixed(0) + '" y="' + (p.y + 4).toFixed(0) + '">' +
              esc(p.n) + '</text>';
          }).join('') +
        '</svg></div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">按天看</p>' +
        '<p class="ov-dsec__s">每天最好的一张占两格</p></div></div>' + days +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="ov-dsec__head"><div><p class="ov-dsec__t">一起去的人</p>' +
        '<p class="ov-dsec__s">按这次出镜的张数排</p></div></div>' +
        '<div class="ov-dpeople">' + t.who.map(function (n, i) {
          return '<button type="button" class="ov-dperson js-person" data-person="' + esc(n) + '">' +
            '<img class="ov-dperson__img" src="' + faceOf(n) + '" alt="' + esc(n) + ' 的头像" loading="lazy" decoding="async">' +
            '<span class="ov-dperson__n">' + esc(n) + '</span>' +
            '<span class="ov-dperson__m">这次 ' + Math.round(t.count / (2.2 + i * 0.5)) + ' 张</span></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="ov-dsec">' +
        '<div class="row row-wrap" style="--row-gap: var(--space-5)">' +
          '<button type="button" class="ov-btn ov-btn--quiet">重新生成回忆</button>' +
          '<button type="button" class="ov-btn ov-btn--quiet">导出这次旅程</button>' +
          '<button type="button" class="ov-btn ov-btn--quiet">改名</button>' +
          '<button type="button" class="ov-btn ov-btn--quiet">不是一次旅程，拆开</button>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  function openDetail(kind, name) {
    dScroll.innerHTML = kind === 'person' ? personHTML(name) : tripHTML(name);
    dScroll.scrollTop = 0;
    elDetail.setAttribute('aria-label', (kind === 'person' ? '人物详情：' : '旅程详情：') + name);
    if (stack.indexOf(elDetail) > -1) { return; }
    openLayer(elDetail);
  }

  /* =========================================================================
     8 · 全局事件委托
     ========================================================================= */

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) { return; }

    var goto = t.closest('.js-goto');
    if (goto && goto.closest('.ov-layer')) {
      window.setTimeout(closeAll, 0);
      return;
    }

    var mem = t.closest('.js-memory');
    if (mem) { e.preventDefault(); openPlayer(mem); return; }

    var photo = t.closest('.js-photo');
    if (photo) { e.preventDefault(); openViewer(photo); return; }

    var person = t.closest('.js-person');
    if (person) {
      e.preventDefault();
      var pn = person.getAttribute('data-person') || '';
      if (stack.indexOf(elViewer) > -1) { closeViewer(); }
      window.setTimeout(function () { openDetail('person', pn); }, 60);
      return;
    }

    var trip = t.closest('.js-trip');
    if (trip) { e.preventDefault(); openDetail('trip', trip.getAttribute('data-trip') || ''); return; }

    var up = t.closest('.js-upload');
    if (up) { e.preventDefault(); openLayer(elUpload); return; }

    var mg = t.closest('.js-manage');
    if (mg) { e.preventDefault(); openLayer(elManage); return; }
  });

  /* =========================================================================
     9 · 首次渲染
     ========================================================================= */

  buildHist();
  wxRangeSum();
  wxSum();
  renderTable();
  renderFaces();
  renderYears();
  [].forEach.call(elManage.querySelectorAll('[data-ov-sort]'), function (t) {
    t.setAttribute('aria-sort', t.getAttribute('data-ov-sort') === 'date' ? 'descending' : 'none');
  });
}
