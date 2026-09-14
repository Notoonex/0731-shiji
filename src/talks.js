/* ===========================================================================
   talks · 聚会 / 名场面 / 「话」视图
   =========================================================================== */
function initTalks() {
  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  var P = 'assets/people/';
  var NAMES = {
    u01: '林知遥', u02: '陈屿', u03: '苏念', u04: '周斯年', u05: '何时', u06: '许清和',
    u07: '江野', u08: '温言', u09: '沈随意', u10: '罗一鸣', u11: '钟晚', u12: '叶生'
  };

  /* ----------------------------------------------------------------------
     聚会数据
     photos 为空 = 没去成
     ---------------------------------------------------------------------- */
  var GATHERINGS = {
    g1: {
      when: '2019年7月20日 · 周六', name: '散伙饭 · 老地方', status: 'done',
      meta: '12 人应约 · 12 人到场 · 126 张照片 · 聊到凌晨 2 点',
      chat: [
        ['u04', '11:20', '后天毕业典礼，晚上老地方，都来'],
        ['u02', '11:21', '来'],
        ['u01', '11:21', '+1'],
        ['u03', '11:22', '算我一个'],
        ['u05', '11:22', '来'],
        ['u06', '11:40', '我订位子，十二个人'],
        ['u04', '11:41', '人齐了']
      ],
      photos: ['p037', 'p030', 'p041', 'p033', 'p042', 'p046', 'p031', 'p040'],
      attend: ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07', 'u08'], absent: []
    },
    g2: {
      when: '2019年8月10日 — 8月13日', name: '大理 · 洱海边的四天', status: 'done',
      meta: '8 人应约 · 5 人到场 · 128 张照片 · 6 段视频',
      chat: [
        ['u01', '20:02', '八月十号大理，机票我看好了'],
        ['u03', '20:03', '走'],
        ['u02', '20:03', '+1'],
        ['u04', '20:11', '算我一个'],
        ['u08', '20:30', '我也去'],
        ['u05', '21:44', '我请不下来假'],
        ['u06', '22:10', '下次一定']
      ],
      photos: ['p021', 'p014', 'p017', 'p018', 'p023', 'p025', 'p027', 'p029'],
      attend: ['u01', 'u02', 'u03', 'u04', 'u08'], absent: ['u05', 'u06']
    },
    g3: {
      when: '2019年6月18日 · 深夜', name: '说好一起去西藏', status: 'miss',
      meta: '7 人应约 · 一直没去 · 后来被重提 12 次',
      chat: [
        ['u04', '23:14', '毕业了咱们去趟西藏吧'],
        ['u02', '23:14', '走'],
        ['u03', '23:15', '+1'],
        ['u01', '23:15', '我攒钱'],
        ['u06', '23:16', '算我一个'],
        ['u08', '23:20', '要去就今年去'],
        ['u05', '23:47', '我妈不让']
      ],
      photos: [], attend: [], absent: ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u08'],
      echo: '最近一次被提起是 2025 年 3 月，苏念说「那次说好去西藏的，六年了」。'
    },
    g4: {
      when: '2021年10月1日 · 周五', name: '陈屿的婚礼', status: 'done',
      meta: '12 人应约 · 11 人到场 · 341 张照片',
      chat: [
        ['u02', '12:02', '十月一号，都来'],
        ['u03', '12:02', '？？？'],
        ['u01', '12:03', '你连恋爱都没说过'],
        ['u02', '12:03', '现在说了'],
        ['u04', '12:04', '伴郎我的'],
        ['u06', '12:05', '来'],
        ['u08', '12:05', '+1'],
        ['u05', '12:30', '我肯定到']
      ],
      photos: ['p033', 'p030', 'p041', 'p042', 'p036', 'p034', 'p035', 'p032'],
      attend: ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07', 'u08'], absent: ['u10']
    },
    g5: {
      when: '2017年9月6日 · 周三', name: '军训完的第一顿', status: 'done',
      meta: '9 人应约 · 9 人到场 · 31 张照片 · 这个群的第一天',
      chat: [
        ['u04', '21:06', '建了个群，军训完各回各家之前先把人凑齐'],
        ['u01', '21:07', '名字叫什么'],
        ['u02', '21:07', '老友记·永不解散'],
        ['u03', '21:08', '太土了吧'],
        ['u02', '21:08', '八年后你会谢我'],
        ['u04', '21:15', '明天六点，学校后门']
      ],
      photos: ['p030', 'p036', 'p034', 'p031'],
      attend: ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07', 'u08'], absent: []
    },
    g6: {
      when: '2020年4月11日', name: '疫情后第一次见面', status: 'miss',
      meta: '10 人应约 · 改期 3 次后不了了之',
      chat: [
        ['u01', '19:02', '解封了，出来吃个饭？'],
        ['u02', '19:03', '来'],
        ['u04', '19:03', '+1'],
        ['u03', '19:05', '算我一个'],
        ['u06', '19:40', '再等等吧'],
        ['u01', '20:12', '那下周'],
        ['u05', '20:14', '下周我出差']
      ],
      photos: [], attend: [], absent: ['u01', 'u02', 'u03', 'u04', 'u05', 'u06'],
      echo: '半年后才真的见上，那次只来了 4 个人。'
    },
    g7: {
      when: '2023年5月20日 · 周六', name: '毕业十年，二中门口', status: 'done',
      meta: '11 人应约 · 8 人到场 · 214 张照片',
      chat: [
        ['u03', '09:11', '今年整十年，回学校看看？'],
        ['u01', '09:12', '来'],
        ['u04', '09:12', '+1'],
        ['u02', '09:14', '我带孩子一起'],
        ['u08', '09:20', '算我一个'],
        ['u05', '10:02', '在路上了'],
        ['u03', '10:03', '还没到日子呢']
      ],
      photos: ['p031', 'p046', 'p040', 'p037', 'p043', 'p045'],
      attend: ['u01', 'u02', 'u03', 'u04', 'u06', 'u08'], absent: ['u05', 'u07', 'u11']
    },
    g8: {
      when: '2025年6月14日', name: '说要去看海', status: 'open',
      meta: '6 人应约 · 还没定下日子',
      chat: [
        ['u08', '22:31', '好久没一起出去了，去看看海？'],
        ['u01', '22:33', '来'],
        ['u03', '22:35', '+1'],
        ['u04', '22:40', '算我一个'],
        ['u02', '23:02', '等我请到假'],
        ['u05', '23:10', '下次一定']
      ],
      photos: [], attend: [], absent: ['u01', 'u02', 'u03', 'u04', 'u05', 'u08'],
      echo: '最近一次提起是 11 天前。'
    }
  };

  /* 鸽王榜：应约 / 到场 */
  var BOARD = [
    ['u02', 34, 31], ['u01', 34, 30], ['u03', 31, 26], ['u04', 34, 28],
    ['u08', 29, 22], ['u06', 26, 19], ['u07', 24, 16], ['u09', 22, 14],
    ['u11', 20, 12], ['u12', 18, 10], ['u10', 25, 13], ['u05', 28, 12]
  ];

  /* 每小时说话量（0–23） */
  var HOURS = [312, 186, 96, 41, 18, 22, 64, 180, 420, 560, 610, 720,
               980, 640, 590, 620, 710, 860, 1240, 1580, 1720, 1980, 1640, 820];

  /* ----------------------------------------------------------------------
     横滑
     ---------------------------------------------------------------------- */
  function wireRail(railId, prevId, nextId) {
    var rail = document.getElementById(railId);
    var prev = document.getElementById(prevId);
    var next = document.getElementById(nextId);
    if (!rail || !prev || !next) { return; }

    function page() {
      var card = rail.firstElementChild;
      if (!card) { return rail.clientWidth; }
      var cs = window.getComputedStyle(rail);
      var gap = parseFloat(cs.columnGap || cs.gap) || 20;
      var step = card.offsetWidth + gap;
      return Math.max(step, Math.floor(rail.clientWidth / step) * step);
    }

    function sync() {
      prev.disabled = rail.scrollLeft < 8;
      next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8;
    }

    prev.addEventListener('click', function () {
      rail.scrollBy({ left: -page(), behavior: reduced ? 'auto' : 'smooth' });
    });
    next.addEventListener('click', function () {
      rail.scrollBy({ left: page(), behavior: reduced ? 'auto' : 'smooth' });
    });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }

  wireRail('tk-gather-rail', 'tk-gather-prev', 'tk-gather-next');
  wireRail('tk-hl-rail', 'tk-hl-prev', 'tk-hl-next');

  /* ----------------------------------------------------------------------
     「话」视图：tab 切换
     ---------------------------------------------------------------------- */
  var tabs = document.querySelectorAll('.tk-tab');
  function showPanel(key) {
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tk-tab') === key;
      tabs[i].classList.toggle('is-on', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    var panels = document.querySelectorAll('.tk-panel');
    for (var k = 0; k < panels.length; k++) {
      var isOn = panels[k].id === 'tk-panel-' + key;
      panels[k].hidden = !isOn;
      panels[k].classList.toggle('is-on', isOn);
    }
  }
  for (var t = 0; t < tabs.length; t++) {
    (function (btn) {
      btn.addEventListener('click', function () { showPanel(btn.getAttribute('data-tk-tab')); });
    })(tabs[t]);
  }

  /* ----------------------------------------------------------------------
     名场面网格：直接复用首页那批卡，不重复写一份 DOM
     ---------------------------------------------------------------------- */
  var grid = document.getElementById('tk-scene-grid');
  var hlRail = document.getElementById('tk-hl-rail');
  if (grid && hlRail) {
    var cards = hlRail.querySelectorAll('.tk-hcard');
    for (var c = 0; c < cards.length; c++) {
      grid.appendChild(cards[c].cloneNode(true));
    }
  }

  /* ----------------------------------------------------------------------
     鸽王榜
     ---------------------------------------------------------------------- */
  var body = document.getElementById('tk-board-body');
  if (body) {
    var rows = BOARD.slice().sort(function (a, b) { return b[2] / b[1] - a[2] / a[1]; });
    var html = '';
    for (var r = 0; r < rows.length; r++) {
      var id = rows[r][0], asked = rows[r][1], came = rows[r][2];
      var rate = Math.round(came / asked * 100);
      var low = rate < 60;
      html += '<tr><td><span class="tk-who"><img src="' + P + id + '.jpg" alt="">' + NAMES[id]
        + (r === rows.length - 1 ? '<span class="tk-crown">鸽王</span>' : '') + '</span></td>'
        + '<td>' + asked + '</td><td>' + came + '</td><td>' + rate + '%</td>'
        + '<td><span class="tk-bar' + (low ? ' tk-bar--low' : '') + '"><i style="width:' + rate + '%"></i></span></td></tr>';
    }
    body.innerHTML = html;
  }

  /* ----------------------------------------------------------------------
     活跃时段柱状图
     ---------------------------------------------------------------------- */
  var bars = document.getElementById('tk-hours-bars');
  if (bars) {
    var max = Math.max.apply(null, HOURS), bh = '';
    for (var h = 0; h < HOURS.length; h++) {
      bh += '<i style="height:' + Math.max(3, Math.round(HOURS[h] / max * 100)) + '%"></i>';
    }
    bars.innerHTML = bh;
  }

  /* ----------------------------------------------------------------------
     聚会详情叠层
     ---------------------------------------------------------------------- */
  var detail = document.getElementById('tk-detail');
  var panel = document.getElementById('tk-detail-panel');
  var scroll = document.getElementById('tk-detail-scroll');
  var lastFocus = null;

  function chatHtml(chat) {
    var s = '';
    for (var i = 0; i < chat.length; i++) {
      var m = chat[i];
      s += '<div class="tk-msg"><img class="tk-msg__ava" src="' + P + m[0] + '.jpg" alt="">'
        + '<div><p class="tk-msg__who">' + NAMES[m[0]] + '<time>' + m[1] + '</time></p>'
        + '<p class="tk-msg__say">' + m[2] + '</p></div></div>';
    }
    return s;
  }

  function peopleHtml(ids, absent) {
    var s = '';
    for (var i = 0; i < ids.length; i++) {
      s += '<span class="tk-dt__p' + (absent ? ' tk-dt__p--absent' : '') + '">'
        + '<img src="' + P + ids[i] + '.jpg" alt="">' + NAMES[ids[i]] + '</span>';
    }
    return s;
  }

  function open(key) {
    var g = GATHERINGS[key];
    if (!g || !detail || !scroll) { return; }
    lastFocus = document.activeElement;

    var s = '<p class="tk-dt__when">' + g.when + '</p>'
      + '<h2 class="tk-dt__name" id="tk-detail-name">' + g.name + '</h2>'
      + '<p class="tk-dt__meta">' + g.meta + '</p>'
      + '<p class="tk-dt__label">当时是这么约的</p>'
      + '<div class="tk-dt__chat">' + chatHtml(g.chat) + '</div>';

    if (g.photos.length) {
      s += '<div class="tk-dt__sep"><span>这一天真的发生了</span></div><div class="tk-dt__photos">';
      for (var i = 0; i < g.photos.length; i++) {
        s += '<img class="js-photo" src="assets/photos/' + g.photos[i] + '.jpg" alt="'
          + g.name + '的照片" loading="lazy" decoding="async"'
          + ' data-photo="assets/photos/' + g.photos[i] + '.jpg"'
          + ' data-caption="' + g.name + '" data-date="' + g.when + '"'
          + ' data-group="老友记 · 永不解散">';
      }
      s += '</div>';
    } else {
      s += '<div class="tk-dt__sep"><span>然后就没有然后了</span></div>'
        + '<p class="tk-dt__empty">这一天没有留下任何照片。' + (g.echo || '') + '</p>';
    }

    if (g.attend.length) {
      s += '<p class="tk-dt__label" style="margin-top:var(--space-8)">到场</p>'
        + '<div class="tk-dt__who">' + peopleHtml(g.attend, false) + '</div>';
    }
    if (g.absent.length) {
      s += '<p class="tk-dt__label" style="margin-top:var(--space-6)">'
        + (g.attend.length ? '答应了没来' : '当时都说要去') + '</p>'
        + '<div class="tk-dt__who">' + peopleHtml(g.absent, true) + '</div>';
    }

    scroll.innerHTML = s;
    scroll.scrollTop = 0;
    detail.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      detail.classList.add('is-open');
      if (panel) { panel.focus(); }
    });
  }

  function close() {
    if (!detail || detail.hidden) { return; }
    detail.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(function () { detail.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest ? e.target.closest('.js-gathering') : null;
    if (card) { open(card.getAttribute('data-g')); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && detail && !detail.hidden) { close(); return; }
    if (e.key !== 'Enter' && e.key !== ' ') { return; }
    var el = document.activeElement;
    if (el && el.classList && el.classList.contains('js-gathering')) {
      e.preventDefault();
      open(el.getAttribute('data-g'));
    }
  });

  var closeBtn = document.getElementById('tk-detail-close');
  if (closeBtn) { closeBtn.addEventListener('click', close); }
  var scrim = document.getElementById('tk-detail-scrim');
  if (scrim) { scrim.addEventListener('click', close); }
}
