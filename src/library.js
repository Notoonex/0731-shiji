/* =============================================================================
   时光 · 图库视图 library.js
   外层统一调用 initLibrary()，本文件不自动执行。
   ============================================================================= */

function initLibrary() {
  'use strict';

  var view = document.getElementById('view-library');
  if (!view || view.dataset.lbReady === '1') { return; }
  view.dataset.lbReady = '1';

  /* ---------------------------------------------------------------------------
     0. 基础工具
     --------------------------------------------------------------------------- */

  var TONE = { warm: '#3a2e24', cool: '#1c2531', bright: '#2f343a', dark: '#15161a', neutral: '#292a2e' };

  function $(sel) { return view.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(view.querySelectorAll(sel)); }

  function reduced() {
    if (document.documentElement.getAttribute('data-motion') === 'off') { return true; }
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function throttleRaf(fn) {
    var ticking = false;
    return function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; fn(); });
    };
  }

  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* 由字符串派生的稳定伪随机，保证同一条内容每次渲染都长一样 */
  function seedRand(seed) {
    var s = 2166136261;
    for (var i = 0; i < seed.length; i++) { s = Math.imul(s ^ seed.charCodeAt(i), 16777619); }
    return function () {
      s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
      return s / 4294967296;
    };
  }

  /* ---------------------------------------------------------------------------
     1. 素材池与上下文（供「全部」网格与「载入更早」构建真实条目）
     --------------------------------------------------------------------------- */

  var POOL = [
    ['p001', 'cool', '雪线之上层峦叠嶂的高原雪山'], ['p002', 'warm', '晨光越过峡谷崖壁洒进山谷'],
    ['p003', 'warm', '暮色浅水上纵身跃起的剪影'], ['p004', 'warm', '高处俯瞰的金褐色荒原与远方山脊'],
    ['p005', 'warm', '逆光黄昏中层层起伏的丘陵与柏树'], ['p006', 'cool', '雾中林荫道尽头渐渐消失的公路'],
    ['p007', 'warm', '丘陵上的农舍与柏树列'], ['p008', 'warm', '一道锋利的沙丘脊线把画面切成明暗两半'],
    ['p009', 'warm', '穿过沙丘的双黄线公路伸向天际'], ['p010', 'cool', '雾中笔直延伸的荒原公路'],
    ['p011', 'bright', '云海之上沿岩脊行走的登山队'], ['p012', 'warm', '落日下泛红的跨海大桥全景'],
    ['p013', 'cool', '傍晚崖壁上层叠的彩色房屋'], ['p014', 'cool', '薄雾清晨里蜿蜒穿过草甸的溪流'],
    ['p015', 'cool', '笔直伸入松林深处的乡间小径'], ['p016', 'warm', '通向绿林深处的旧铁轨'],
    ['p017', 'warm', '湖畔草坡上一架空荡的秋千'], ['p018', 'warm', '海边一排棕榈树的褪色午后'],
    ['p019', 'warm', '日出时分结着冰纹的荒野土路'], ['p020', 'bright', '沿着海岸线延伸的铁轨与信号灯'],
    ['p021', 'warm', '高处俯瞰的海岸线与碧蓝海湾'], ['p022', 'warm', '金色麦田尽头压得极低的蓝色地平线'],
    ['p023', 'bright', '贴着峭壁的盘山公路'], ['p024', 'neutral', '沙丘上一串独行的脚印'],
    ['p025', 'warm', '清晨草地上的老木屋与长长的树影'], ['p026', 'warm', '冬天的街角，塔尖从光秃的枝丫后露出来'],
    ['p027', 'warm', '赭红色沙丘斜坡压在稀疏灌木之上'], ['p028', 'dark', '暴风雨前的田野车辙路'],
    ['p029', 'cool', '紧贴山壁的公路钻进一个小隧道口'], ['p030', 'dark', '手中握着的仙女棒在暗处炸开火花'],
    ['p031', 'warm', '午后咖啡馆长木桌上的一杯拿铁'], ['p032', 'warm', '清晨书页旁热气升腾的一杯茶'],
    ['p033', 'warm', '人声鼎沸的吧台与暖黄灯光'], ['p034', 'warm', '玻璃壶里的茶汤透着光'],
    ['p035', 'warm', '木砧板上的紫洋葱、香草和胡椒粒'], ['p036', 'warm', '小咖啡馆的露天座位'],
    ['p037', 'warm', '黄昏长椅上并肩而坐的两个人'], ['p038', 'neutral', '一个人独自走在空旷公路的白线之间'],
    ['p039', 'warm', '黄昏礁岩上独自眺望大海的身影'], ['p040', 'warm', '落日金光里回望的长发背影'],
    ['p041', 'dark', '逆光舞台前举起双手的人群剪影'], ['p042', 'dark', '演出现场光束扫过举手的人群'],
    ['p043', 'warm', '逆光的花田里，一个人独自走向落日'], ['p044', 'warm', '傍晚山崖上裹着外套眺望远方的人'],
    ['p045', 'warm', '逆光落日里回望的女子侧影'], ['p046', 'warm', '麦田里戴墨镜微笑的女孩'],
    ['p047', 'dark', '手持老式相机低头取景的黑白人像'], ['p048', 'warm', '躺在秋日草地上翘起的一双帆布鞋'],
    ['p049', 'neutral', '薄雾中远远走着的几个人影'], ['p050', 'warm', '一个人和一辆自行车停在逆光里'],
    ['p051', 'cool', '坐在冬天的江边长椅上望着对岸的高楼'], ['p052', 'warm', '棕榈树下的滑板场，一个人腾空跃过台阶'],
    ['p053', 'cool', '雾中的枯草地里，一个人影正慢慢走远'], ['p054', 'dark', '落地窗前独自站立的人影剪影'],
    ['p055', 'cool', '穿连帽衫的人独自望着冬日海浪'], ['p056', 'neutral', '黑白影调里坐在岸边望向城市的人'],
    ['p057', 'cool', '雏菊花丛后戴头巾的女子侧脸'], ['p058', 'dark', '落地窗前望向城市的两个人'],
    ['p059', 'warm', '双手捧着旧胶片相机的特写'], ['p060', 'bright', '晾着衣物的彩色老街，清晨无人'],
    ['p061', 'cool', '雪坡上方交错而过的缆车吊厢'], ['p062', 'warm', '阴云下泛金的成熟麦田'],
    ['p063', 'bright', '仰望升空中的彩色热气球吊篮'], ['p064', 'warm', '坡道上交会的两辆黄色老电车'],
    ['p065', 'bright', '仰望云天下的岩顶与稀疏灌木'], ['p066', 'bright', '麦田里收完草垛的拖拉机与流云'],
    ['p067', 'cool', '黄昏湿地草原上的疏林与低云'], ['p068', 'warm', '高处枯枝后蜿蜒的山谷公路'],
    ['p069', 'neutral', '淡粉色调的湖岸荒草与远山'], ['p070', 'bright', '运河边的彩色老房子'],
    ['p071', 'bright', '热气球升在棕榈树林上空'], ['p072', 'cool', '公路旁的白色风车，天空干净得发蓝'],
    ['p073', 'bright', '穿过森林的铁轨，尽头被光晕吞掉'], ['p074', 'warm', '密集的彩色老楼与窄街'],
    ['p075', 'warm', '秋草地上倾斜的旧木栅栏'], ['p076', 'dark', '夜色中亮起灯串的大桥与天际线'],
    ['p077', 'dark', '夜幕下横跨海湾的大吊桥'], ['p078', 'dark', '河岸夜色中的老建筑与桥灯'],
    ['p079', 'warm', '雨后的老街，头顶串灯一路亮到巷子尽头'], ['p080', 'dark', '浓雾里的火车站台与一串橙色光点'],
    ['p081', 'dark', '夜色里的大桥与对岸天际线'], ['p082', 'warm', '夕阳灌满整条老城街道，路人成剪影'],
    ['p083', 'warm', '金色雾霭中隐约浮现的城市天际线'], ['p084', 'warm', '挂满灯串的老巷夜色与暖黄窗光'],
    ['p085', 'dark', '蓝调时刻俯瞰灯火通明的城市'], ['p086', 'cool', '清晨无人的老城铁艺街道'],
    ['p087', 'bright', '蓝色海湾上的独木舟与远处天际线'], ['p088', 'neutral', '背包客站在喧闹的街头'],
    ['p089', 'neutral', '落叶林间木栈道上迈步的双腿'], ['p090', 'warm', '黄昏土路中央回头看向镜头的动物'],
    ['p091', 'dark', '黑色小狗坐在木地板上抬头看你'], ['p092', 'neutral', '猫咪鼻尖与胡须的柔软特写'],
    ['p093', 'warm', '高地牛顶着一头长毛站在沙地上'], ['p094', 'bright', '水鸟站在木桩上，身后是浅海'],
    ['p095', 'bright', '腊肠狗把鼻子埋进青草里嗅来嗅去'], ['p096', 'warm', '山脊小路上，晨光从山谷深处涌上来'],
    ['p097', 'bright', '白房子与风车的午后'], ['p098', 'dark', '乌云压顶下礁岸边的黑白灯塔'],
    ['p099', 'warm', '通向水中亭子的木栈桥，静谧无人'], ['p100', 'cool', '晨雾草地上孤立的紫调枯树'],
    ['p101', 'warm', '橘红日落下起伏的绿色牧场']
  ];

  var CTX = [
    { date: '2025年9月9日', place: '杭州 滨江', group: '杭州搭子局', gid: 'gdazi', people: '周斯年,钟晚', year: '2025' },
    { date: '2025年9月6日', place: '杭州 教工路', group: '四〇七 · 一直在', gid: 'g407', people: '林知遥,陈屿,苏念,何时', year: '2025' },
    { date: '2025年8月24日', place: '湖州 莫干山', group: '山系周末', gid: 'gshan', people: '江野,温言,罗一鸣', year: '2025' },
    { date: '2025年6月14日', place: '杭州 西溪', group: '杭州搭子局', gid: 'gdazi', people: '沈随意,叶生', year: '2025' },
    { date: '2024年12月31日', place: '杭州 武林广场', group: '四〇七 · 一直在', gid: 'g407', people: '陈屿,苏念', year: '2024' },
    { date: '2024年10月3日', place: '黄山 宏村', group: '山系周末', gid: 'gshan', people: '林知遥,江野', year: '2024' },
    { date: '2024年7月20日', place: '厦门 鼓浪屿', group: '二中 2013 届（3）班', gid: 'gerzhong', people: '许清和,温言', year: '2024' },
    { date: '2023年10月5日', place: '甘孜 稻城亚丁', group: '四〇七 · 一直在', gid: 'g407', people: '陈屿,苏念,林知遥,何时', year: '2023' },
    { date: '2023年5月21日', place: '杭州 滨江', group: '四〇七 · 一直在', gid: 'g407', people: '陈屿,苏念', year: '2023' },
    { date: '2022年9月10日', place: '杭州 教工路', group: '四〇七 · 一直在', gid: 'g407', people: '林知遥,周斯年,钟晚', year: '2022' },
    { date: '2022年4月2日', place: '南京 玄武湖', group: '二中 2013 届（3）班', gid: 'gerzhong', people: '许清和', year: '2022' },
    { date: '2021年10月2日', place: '大理 双廊', group: '四〇七 · 一直在', gid: 'g407', people: '苏念,叶生,江野', year: '2021' },
    { date: '2021年1月7日', place: '杭州 教工路', group: '四〇七 · 一直在', gid: 'g407', people: '林知遥,陈屿', year: '2021' },
    { date: '2020年8月16日', place: '重庆 洪崖洞', group: '陈家老小', gid: 'gjia', people: '沈随意,罗一鸣', year: '2020' },
    { date: '2019年8月11日', place: '舟山 东极岛', group: '四〇七 · 一直在', gid: 'g407', people: '林知遥,陈屿,苏念,周斯年', year: '2019' },
    { date: '2019年3月30日', place: '杭州 太子湾', group: '四〇七 · 一直在', gid: 'g407', people: '温言,钟晚', year: '2019' },
    { date: '2018年7月23日', place: '呼伦贝尔 额尔古纳', group: '四〇七 · 一直在', gid: 'g407', people: '何时,江野', year: '2018' },
    { date: '2017年9月6日', place: '杭州 教工路', group: '四〇七 · 一直在', gid: 'g407', people: '林知遥,陈屿,苏念,周斯年,何时', year: '2017' }
  ];

  var VOICES = [
    { dur: '0:23', text: '我们已经上山了，这边全是雾，能见度就十几米' },
    { dur: '0:47', text: '它把 2019 年东极岛那天单独剪成了一段影片' },
    { dur: '1:12', text: '明天四点起，别赖床，车在民宿门口等' },
    { dur: '0:09', text: '你们快看第三张，周斯年那个表情' },
    { dur: '2:04', text: '刚到滨江，钥匙在门口花盆下面，自己拿' },
    { dur: '0:38', text: '船票买到了，五点在码头集合' }
  ];

  var FILES = [
    { name: '莫干山两日 · 原图合集.zip', meta: 'ZIP · 1.8 GB · 原文件已过期，本地已备份' },
    { name: '八周年 · 精修 128 张.zip', meta: 'ZIP · 4.2 GB · 本地已备份' },
    { name: '毕业设计开题.doc', meta: 'DOC · 2.4 MB · 本地已备份' },
    { name: '稻城行程与住宿.pdf', meta: 'PDF · 860 KB · 本地已备份' }
  ];

  /* ---------------------------------------------------------------------------
     2. 瓦片构建
     --------------------------------------------------------------------------- */

  var CHECK_SVG = '<span class="lb-check" aria-hidden="true"><svg class="lb-check-mark" viewBox="0 0 24 24"><path d="M5 13l4.5 4.5L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  var VEIL_SVG = '<span class="lb-tile-veil" aria-hidden="true"></span>';
  var STAR_SVG = '<span class="lb-badge lb-badge-star"><svg class="lb-badge-icon lb-is-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z"/></svg></span>';
  var HEART_SVG = '<span class="lb-badge lb-badge-fav"><svg class="lb-badge-icon lb-is-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4S3.8 15 3.8 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.2 2.4c0 5.6-8.2 11-8.2 11z"/></svg></span>';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function waveSvg(seed) {
    var r = seedRand(seed), bars = [], i, h;
    for (i = 0; i < 34; i++) {
      h = 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * (i + 0.5) / 34), 0.35) * (0.3 + 0.7 * r());
      bars.push('<rect class="lb-alt-wave-bar" x="' + (i * 5) + '" y="' + ((1 - h) * 9).toFixed(1) +
                '" width="2.4" height="' + (h * 18).toFixed(1) + '" rx="1.2"/>');
    }
    return '<svg class="lb-alt-wave" viewBox="0 0 170 18" preserveAspectRatio="none" aria-hidden="true">' + bars.join('') + '</svg>';
  }

  /* i 为全局序号，决定它是照片 / 视频 / 语音 / 文件，以及角标 */
  function buildTile(i, extraClass) {
    var ctx = CTX[i % CTX.length];
    var cls = extraClass ? ' ' + extraClass : '';
    var score = (seedRand('s' + i)() * 100).toFixed(1);

    if (i % 23 === 7) {
      var v = VOICES[(i / 23 | 0) % VOICES.length];
      return '<div class="lb-tile lb-tile-alt lb-is-audio' + cls + '" tabindex="0" role="group" ' +
        'aria-label="' + esc(ctx.people.split(',')[0]) + '的语音，' + v.dur + '" ' +
        'data-type="audio" data-year="' + ctx.year + '" data-gid="' + ctx.gid + '" ' +
        'data-place="' + esc(ctx.place) + '" data-people="' + esc(ctx.people) + '" data-score="' + score + '">' +
        '<svg class="lb-alt-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3z"/><path d="M5.5 11.5v.8a6.5 6.5 0 0 0 13 0v-.8M12 18.8V21" stroke-linecap="round"/></svg>' +
        waveSvg('v' + i) +
        '<p class="lb-alt-text">' + esc(v.text) + '</p>' +
        '<span class="lb-alt-meta tnum">' + v.dur + ' · ' + esc(ctx.date) + '</span>' + CHECK_SVG + '</div>';
    }

    if (i % 37 === 11) {
      var f = FILES[(i / 37 | 0) % FILES.length];
      return '<div class="lb-tile lb-tile-alt lb-is-file' + cls + '" tabindex="0" role="group" ' +
        'aria-label="文件 ' + esc(f.name) + '" ' +
        'data-type="file" data-year="' + ctx.year + '" data-gid="' + ctx.gid + '" ' +
        'data-place="' + esc(ctx.place) + '" data-people="' + esc(ctx.people) + '" data-score="' + score + '">' +
        '<svg class="lb-alt-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 3.5H8A2.5 2.5 0 0 0 5.5 6v12A2.5 2.5 0 0 0 8 20.5h8a2.5 2.5 0 0 0 2.5-2.5V8.5z" stroke-linejoin="round"/><path d="M13.5 3.5v5h5" stroke-linejoin="round"/></svg>' +
        '<p class="lb-alt-text">' + esc(f.name) + '</p>' +
        '<span class="lb-alt-meta tnum">' + esc(f.meta) + '</span>' + CHECK_SVG + '</div>';
    }

    var p = POOL[i % POOL.length];
    var src = 'assets/photos/' + p[0] + '.jpg';
    var isVideo = (i % 11 === 3);
    var dur = ['0:18', '0:36', '0:52', '1:12', '2:05'][(i / 11 | 0) % 5];
    var badge = '';
    if (isVideo) { badge = '<span class="lb-badge lb-badge-dur tnum">' + dur + '</span>'; }
    else if (i % 17 === 5) { badge = '<span class="lb-badge lb-badge-live">LIVE</span>'; }
    if (i % 13 === 6) { badge += STAR_SVG; }
    else if (i % 19 === 9) { badge += HEART_SVG; }

    var alt = ctx.date + ' ' + ctx.place + ' ' + p[2];
    return '<button type="button" class="lb-tile js-photo' + cls + '" ' +
      'data-photo="' + src + '" data-caption="' + esc(p[2]) + '" data-date="' + esc(ctx.date) + '" ' +
      'data-place="' + esc(ctx.place) + '" data-group="' + esc(ctx.group) + '" data-people="' + esc(ctx.people) + '" ' +
      'data-type="' + (isVideo ? 'video' : 'photo') + '" data-year="' + ctx.year + '" data-gid="' + ctx.gid + '" data-score="' + score + '" ' +
      'style="--ph:' + (TONE[p[1]] || TONE.neutral) + '">' +
      '<img class="lb-tile-img" src="' + src + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
      VEIL_SVG + badge + CHECK_SVG + '</button>';
  }

  /* ---------------------------------------------------------------------------
     3. 图片淡入 + 补齐静态瓦片的遮罩与勾选圈
     --------------------------------------------------------------------------- */

  function hydrate(img) {
    if (!img || img.dataset.lbHy === '1') { return; }
    img.dataset.lbHy = '1';
    function done() { img.classList.add('is-loaded'); }
    if (img.complete && img.naturalWidth > 0) { done(); return; }
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }

  function decorate(scope) {
    var tiles = (scope || view).querySelectorAll('.lb-tile');
    Array.prototype.forEach.call(tiles, function (t) {
      if (t.dataset.lbDeco === '1') { return; }
      t.dataset.lbDeco = '1';
      if (!t.classList.contains('lb-tile-alt') && !t.querySelector('.lb-tile-veil')) {
        t.insertAdjacentHTML('beforeend', VEIL_SVG);
      }
      if (!t.querySelector('.lb-check')) { t.insertAdjacentHTML('beforeend', CHECK_SVG); }
      if (!t.hasAttribute('data-score')) {
        t.setAttribute('data-score', (seedRand(t.getAttribute('data-photo') || String(Math.random()))() * 100).toFixed(1));
      }
    });
    var imgs = (scope || view).querySelectorAll('.lb-tile-img, .lb-year-img');
    Array.prototype.forEach.call(imgs, hydrate);
  }

  decorate(view);

  /* ---------------------------------------------------------------------------
     4. 「全部」网格渲染
     --------------------------------------------------------------------------- */

  var allGrid = $('#lb-allgrid');
  var allNote = $('#lb-all-note');
  var ALL_START = 180, ALL_STEP = 90, ALL_MAX = 450;
  var allCount = 0;

  function renderAll(n) {
    var html = [], i;
    for (i = 0; i < n; i++) { html.push(buildTile(i)); }
    allGrid.innerHTML = html.join('');
    allCount = n;
    decorate(allGrid);
    if (allNote) {
      allNote.textContent = '按时间倒序，一条不漏。当前显示最近的 ' + comma(n) + ' 项，共 12,847 项。';
    }
  }
  renderAll(ALL_START);

  /* ---------------------------------------------------------------------------
     5. 分段控件
     --------------------------------------------------------------------------- */

  var seg = $('#lb-seg');
  var segThumb = $('#lb-seg-thumb');
  var segBtns = $$('.lb-seg-btn');
  var panes = {
    year: $('#lb-pane-year'),
    month: $('#lb-pane-month'),
    day: $('#lb-pane-day'),
    all: $('#lb-pane-all')
  };
  var mode = 'day';

  function moveThumb() {
    var active = segBtns.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0];
    if (!active || !segThumb) { return; }
    var w = active.offsetWidth;
    if (!w) { return; }
    segThumb.style.width = w + 'px';
    segThumb.style.transform = 'translate3d(' + (active.offsetLeft - 2) + 'px,0,0)';
  }

  function setMode(next, focusPane) {
    mode = next;
    segBtns.forEach(function (b) {
      var on = b.dataset.mode === next;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    Object.keys(panes).forEach(function (k) {
      if (!panes[k]) { return; }
      if (k === next) { panes[k].removeAttribute('hidden'); }
      else { panes[k].setAttribute('hidden', ''); }
    });
    moveThumb();
    applySort();
    applyFilters();
    updateMoreBar();
    if (focusPane && panes[next]) { panes[next].scrollIntoView({ block: 'nearest' }); }
  }

  segBtns.forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode, false); });
  });
  seg.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
    e.preventDefault();
    var idx = segBtns.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; });
    idx = (idx + (e.key === 'ArrowRight' ? 1 : -1) + segBtns.length) % segBtns.length;
    segBtns[idx].focus();
    setMode(segBtns[idx].dataset.mode, false);
  });

  window.addEventListener('resize', throttleRaf(moveThumb), { passive: true });
  if (window.ResizeObserver) { new ResizeObserver(moveThumb).observe(seg); }
  new MutationObserver(function () {
    if (!view.hasAttribute('hidden')) { window.requestAnimationFrame(moveThumb); }
  }).observe(view, { attributes: true, attributeFilter: ['hidden'] });

  /* ---------------------------------------------------------------------------
     6. 密度滑块
     --------------------------------------------------------------------------- */

  var densityInput = $('#lb-density-input');
  densityInput.addEventListener('input', function () {
    var n = parseInt(densityInput.value, 10);
    view.style.setProperty('--lb-cols', String(n));
    view.style.setProperty('--lb-day-cols', String(Math.max(3, n - 1)));
    densityInput.setAttribute('aria-valuetext', '每行 ' + n + ' 张');
  });

  /* ---------------------------------------------------------------------------
     7. 排序
     --------------------------------------------------------------------------- */

  var sortBtn = $('#lb-sort-btn');
  var sortMenu = $('#lb-sort-menu');
  var sortMode = 'desc';

  var ORDER = {};
  ['#lb-years', '#lb-months', '#lb-days'].forEach(function (sel) {
    var box = $(sel);
    if (box) { ORDER[sel] = Array.prototype.slice.call(box.children); }
  });

  function applySort() {
    Object.keys(ORDER).forEach(function (sel) {
      var box = $(sel);
      var list = ORDER[sel].slice();
      if (sortMode === 'asc') { list.reverse(); }
      else if (sortMode === 'score') {
        list.sort(function (a, b) { return groupScore(b) - groupScore(a); });
      }
      list.forEach(function (n) { box.appendChild(n); });
    });
    if (sortMode !== 'desc') {
      var tiles = Array.prototype.slice.call(allGrid.children);
      if (sortMode === 'asc') { tiles.reverse(); }
      else {
        tiles.sort(function (a, b) {
          return parseFloat(b.getAttribute('data-score')) - parseFloat(a.getAttribute('data-score'));
        });
      }
      tiles.forEach(function (t) { allGrid.appendChild(t); });
    } else {
      var orig = Array.prototype.slice.call(allGrid.children).sort(function (a, b) {
        return (a.dataset.lbIdx | 0) - (b.dataset.lbIdx | 0);
      });
      orig.forEach(function (t) { allGrid.appendChild(t); });
    }
  }

  function groupScore(g) {
    if (g.dataset.lbGscore) { return parseFloat(g.dataset.lbGscore); }
    var ts = g.querySelectorAll('.lb-tile'), sum = 0, i;
    if (!ts.length) {
      sum = parseFloat(g.getAttribute('data-score') || '0');
    } else {
      for (i = 0; i < ts.length; i++) { sum += parseFloat(ts[i].getAttribute('data-score') || '0'); }
      sum = sum / ts.length;
    }
    g.dataset.lbGscore = String(sum);
    return sum;
  }

  function indexAll() {
    Array.prototype.forEach.call(allGrid.children, function (t, i) {
      if (!t.dataset.lbIdx) { t.dataset.lbIdx = String(i); }
    });
  }
  indexAll();

  function closeSortMenu() {
    sortMenu.setAttribute('hidden', '');
    sortBtn.setAttribute('aria-expanded', 'false');
  }
  sortBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = sortMenu.hasAttribute('hidden');
    if (open) { sortMenu.removeAttribute('hidden'); sortBtn.setAttribute('aria-expanded', 'true'); }
    else { closeSortMenu(); }
  });
  sortMenu.addEventListener('click', function (e) {
    var item = e.target.closest('.lb-menu-item');
    if (!item) { return; }
    sortMode = item.dataset.sort;
    Array.prototype.forEach.call(sortMenu.children, function (n) {
      n.setAttribute('aria-checked', n === item ? 'true' : 'false');
    });
    closeSortMenu();
    applySort();
    toast(sortMode === 'desc' ? '最新的在前' : (sortMode === 'asc' ? '最早的在前' : '按精选度排序'));
  });
  document.addEventListener('click', function (e) {
    if (!sortMenu.hasAttribute('hidden') && !e.target.closest('.lb-menuwrap')) { closeSortMenu(); }
  });

  /* ---------------------------------------------------------------------------
     8. 筛选侧栏
     --------------------------------------------------------------------------- */

  var side = $('#lb-side');
  var filterBtn = $('#lb-filter-btn');
  var countEl = $('#lb-count');
  var emptyDesc = $('#lb-empty-desc');
  var yearFrom = $('#lb-year-from');
  var yearTo = $('#lb-year-to');
  var rangeOut = $('#lb-range-out');
  var histBars = $$('.lb-hist-bar');

  var active = { type: [], gid: [], people: [], place: [] };

  function toggleSide(open) {
    var next = (typeof open === 'boolean') ? open : !view.classList.contains('is-side-open');
    view.classList.toggle('is-side-open', next);
    filterBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    filterBtn.setAttribute('aria-expanded', next ? 'true' : 'false');
    window.requestAnimationFrame(moveThumb);
  }
  filterBtn.addEventListener('click', function () { toggleSide(); });
  $('#lb-side-close').addEventListener('click', function () { toggleSide(false); filterBtn.focus(); });

  side.addEventListener('click', function (e) {
    var btn = e.target.closest('.lb-chip, .lb-person');
    if (!btn) { return; }
    var facet = btn.parentNode.getAttribute('data-facet');
    var value = btn.getAttribute('data-value');
    var on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', on ? 'false' : 'true');
    var arr = active[facet];
    var at = arr.indexOf(value);
    if (on && at > -1) { arr.splice(at, 1); }
    if (!on && at === -1) { arr.push(value); }
    applyFilters();
  });

  function syncRange() {
    var a = parseInt(yearFrom.value, 10), b = parseInt(yearTo.value, 10);
    if (a > b) {
      if (this === yearFrom) { yearTo.value = String(a); b = a; }
      else { yearFrom.value = String(b); a = b; }
    }
    var span = b - a + 1;
    rangeOut.textContent = a + '年 — ' + b + '年 · ' + (span === 9 ? '全部年份' : span + ' 个年份');
    histBars.forEach(function (bar) {
      var y = parseInt(bar.getAttribute('data-year'), 10);
      bar.classList.toggle('is-on', y >= a && y <= b);
    });
    applyFilters();
  }
  yearFrom.addEventListener('input', syncRange);
  yearTo.addEventListener('input', syncRange);

  function hasFilters() {
    return active.type.length || active.gid.length || active.people.length || active.place.length ||
      yearFrom.value !== '2017' || yearTo.value !== '2025';
  }

  function match(el) {
    var y = parseInt(el.getAttribute('data-year') || '0', 10);
    if (y < parseInt(yearFrom.value, 10) || y > parseInt(yearTo.value, 10)) { return false; }
    if (active.type.length && active.type.indexOf(el.getAttribute('data-type')) === -1) { return false; }
    if (active.gid.length && active.gid.indexOf(el.getAttribute('data-gid')) === -1) { return false; }
    if (active.place.length) {
      var pl = el.getAttribute('data-place') || '';
      var hit = active.place.some(function (v) { return pl.indexOf(v) === 0; });
      if (!hit) { return false; }
    }
    if (active.people.length) {
      var ps = (el.getAttribute('data-people') || '').split(',');
      var ok = active.people.some(function (v) { return ps.indexOf(v) > -1; });
      if (!ok) { return false; }
    }
    return true;
  }

  function applyFilters() {
    var pane = panes[mode];
    if (!pane) { return; }
    var items = pane.querySelectorAll('.lb-tile, .lb-year');
    var visible = 0;
    Array.prototype.forEach.call(items, function (el) {
      var ok = match(el);
      el.classList.toggle('is-filtered', !ok);
      if (ok) { visible++; }
      if (!ok && el.classList.contains('is-sel')) { el.classList.remove('is-sel'); }
    });
    Array.prototype.forEach.call(pane.querySelectorAll('.lb-group'), function (g) {
      var n = g.querySelectorAll('.lb-tile:not(.is-filtered)').length;
      g.classList.toggle('is-filtered', n === 0);
    });
    view.classList.toggle('is-empty', visible === 0);
    if (visible === 0) {
      emptyDesc.textContent = '当前条件在这一屏里没有匹配项。去掉一个条件，或者把年份范围放宽。';
    }
    if (hasFilters()) {
      countEl.textContent = '筛选中 · 本屏 ' + comma(visible) + ' 项';
    } else {
      countEl.textContent = '12,847 张 · 8 年';
    }
    syncSelection();
  }

  function resetFilters() {
    active = { type: [], gid: [], people: [], place: [] };
    $$('.lb-chip, .lb-person').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    yearFrom.value = '2017';
    yearTo.value = '2025';
    histBars.forEach(function (b) { b.classList.add('is-on'); });
    rangeOut.textContent = '2017年 — 2025年 · 全部年份';
    applyFilters();
  }
  $('#lb-reset').addEventListener('click', resetFilters);
  $('#lb-empty-reset').addEventListener('click', function () { resetFilters(); toast('已清除筛选'); });

  /* ---------------------------------------------------------------------------
     9. 选择模式
     --------------------------------------------------------------------------- */

  var selectBtn = $('#lb-select-btn');
  var abCount = $('#lb-ab-count');
  var selecting = false;
  var lastIdx = -1;

  function setSelecting(on) {
    selecting = on;
    view.classList.toggle('is-selecting', on);
    selectBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    selectBtn.querySelector('.lb-toolbtn-label').textContent = on ? '完成' : '选择';
    if (!on) { clearSelection(); }
    syncSelection();
  }
  function clearSelection() {
    $$('.lb-tile.is-sel').forEach(function (t) { t.classList.remove('is-sel'); });
    lastIdx = -1;
  }
  function selected() { return $$('.lb-tile.is-sel:not(.is-filtered)'); }
  function syncSelection() {
    var n = selected().length;
    abCount.textContent = n === 0 ? '未选择项目' : '已选 ' + comma(n) + ' 项';
    $$('.lb-ab-btn').forEach(function (b) {
      if (b.dataset.act === 'cancel') { return; }
      b.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    });
  }

  selectBtn.addEventListener('click', function () { setSelecting(!selecting); });

  /* 捕获阶段拦截：选择模式下不让 overlays 模块打开看图器 */
  view.addEventListener('click', function (e) {
    if (!selecting) { return; }
    var tile = e.target.closest('.lb-tile');
    if (!tile || tile.classList.contains('is-filtered')) { return; }
    e.preventDefault();
    e.stopPropagation();

    var pane = panes[mode];
    var list = Array.prototype.slice.call(pane.querySelectorAll('.lb-tile:not(.is-filtered)'));
    var idx = list.indexOf(tile);
    if (e.shiftKey && lastIdx > -1 && idx > -1) {
      var a = Math.min(lastIdx, idx), b = Math.max(lastIdx, idx);
      for (var i = a; i <= b; i++) { list[i].classList.add('is-sel'); }
    } else {
      tile.classList.toggle('is-sel');
      lastIdx = idx;
    }
    syncSelection();
  }, true);

  $('#lb-actionbar').addEventListener('click', function (e) {
    var btn = e.target.closest('.lb-ab-btn');
    if (!btn) { return; }
    var act = btn.dataset.act;
    if (act === 'cancel') { setSelecting(false); return; }
    var n = selected().length;
    if (!n) { return; }
    if (act === 'album') { toast('已把 ' + comma(n) + ' 项加入相簿「合影」'); }
    else if (act === 'feature') { toast('已把 ' + comma(n) + ' 项设为精选'); }
    else if (act === 'share') { toast('已生成 ' + comma(n) + ' 项的分享链接，有效期 7 天'); }
    else if (act === 'delete') {
      selected().forEach(function (t) { t.remove(); });
      toast('已移到最近删除 · ' + comma(n) + ' 项，30 天内可恢复');
      applyFilters();
      return;
    }
    clearSelection();
    syncSelection();
  });

  /* ---------------------------------------------------------------------------
     10. 载入更早
     --------------------------------------------------------------------------- */

  var moreBtn = $('#lb-more');
  var moreNote = $('#lb-morenote');
  var moreWrap = $('#lb-morewrap');
  var daysBox = $('#lb-days');
  var monthsBox = $('#lb-months');

  var MORE_DAYS = [
    { key: '2025-07-19', title: '7月19日 星期六', meta: '舟山 东极岛 · 58 张 · 2 段视频', faces: ['u01', 'u02', 'u03'], names: ['林知遥', '陈屿', '苏念'], n: 10, note: '这一天 58 张 · 05:12 看了日出' },
    { key: '2025-07-06', title: '7月6日 星期日', meta: '苏州 平江路 · 34 张', faces: ['u09', 'u12'], names: ['沈随意', '叶生'], n: 8, note: '这一天 34 张 · 走了 6.2 公里' },
    { key: '2025-06-14', title: '6月14日 星期六', meta: '杭州 西溪 · 42 张', faces: ['u09', 'u12'], names: ['沈随意', '叶生'], n: 10, note: '这一天 42 张 · 野餐到天黑' },
    { key: '2025-06-08', title: '6月8日 星期日', meta: '杭州 西溪 · 27 张', faces: ['u12'], names: ['叶生'], n: 8, note: '这一天 27 张 · 毕业十年那天' }
  ];

  var MORE_MONTHS = [
    { key: '2024-12', title: '2024年12月', meta: '杭州、南京 · 168 张 · 3 段视频', layout: 'lb-collage-a', n: 3 },
    { key: '2024-11', title: '2024年11月', meta: '厦门、杭州 · 96 张', layout: 'lb-collage-b', n: 5 },
    { key: '2024-10', title: '2024年10月', meta: '黄山 宏村、杭州 · 211 张 · 4 段视频', layout: 'lb-collage-c', n: 6 },
    { key: '2024-09', title: '2024年9月', meta: '杭州 · 124 张', layout: 'lb-collage-d', n: 5 }
  ];

  var AREA = ['lb-ar-a', 'lb-ar-b', 'lb-ar-c', 'lb-ar-d', 'lb-ar-e', 'lb-ar-f'];
  var dayCursor = 0, monthCursor = 0, tileSeed = 400;

  function buildDayGroup(d) {
    var faces = d.faces.map(function (u, i) {
      return '<img class="lb-face" src="assets/people/' + u + '.jpg" alt="' + d.names[i] + '" loading="lazy" decoding="async">';
    }).join('');
    var tiles = '', i;
    for (i = 0; i < d.n; i++) { tiles += buildTile(tileSeed++); }
    return '<section class="lb-group" data-group-key="' + d.key + '">' +
      '<div class="lb-dayhead"><div class="lb-grouphead-l">' +
      '<h2 class="lb-daytitle">' + d.title + '</h2>' +
      '<p class="lb-daymeta tnum">' + d.meta + '</p></div>' +
      '<div class="lb-faces" aria-label="在场的人：' + d.names.join('、') + '">' + faces + '</div></div>' +
      '<div class="lb-daygrid">' + tiles + '</div>' +
      '<p class="lb-daynote tnum">' + d.note + '</p></section>';
  }

  function buildMonthGroup(m) {
    var tiles = '', i;
    for (i = 0; i < m.n; i++) { tiles += buildTile(tileSeed++, AREA[i]); }
    return '<section class="lb-group" data-group-key="' + m.key + '">' +
      '<div class="lb-grouphead"><div class="lb-grouphead-l">' +
      '<h2 class="lb-grouptitle">' + m.title + '</h2>' +
      '<p class="lb-groupmeta tnum">' + m.meta + '</p></div></div>' +
      '<div class="lb-collage ' + m.layout + '">' + tiles + '</div></section>';
  }

  function updateMoreBar() {
    if (mode === 'year') {
      moreWrap.setAttribute('hidden', '');
      return;
    }
    moreWrap.removeAttribute('hidden');
    var exhausted = false, note = '';
    if (mode === 'day') {
      exhausted = dayCursor >= MORE_DAYS.length;
      note = exhausted
        ? '这一屏已经排到 2025年6月8日 · 更早的内容切到「月」或「全部」继续看'
        : '已显示到 ' + (dayCursor === 0 ? '2025年8月15日' : MORE_DAYS[dayCursor - 1].title) + ' · 库内最早是 2017年9月6日';
    } else if (mode === 'month') {
      exhausted = monthCursor >= MORE_MONTHS.length;
      note = exhausted
        ? '这一屏已经排到 2024年9月 · 更早的内容切到「年」继续看'
        : '已显示到 ' + (monthCursor === 0 ? '2025年2月' : MORE_MONTHS[monthCursor - 1].title) + ' · 库内最早是 2017年9月';
    } else {
      exhausted = allCount >= ALL_MAX;
      note = exhausted
        ? '这一屏已经载入 ' + comma(ALL_MAX) + ' 项 · 用筛选缩小范围会更快找到'
        : '已载入 ' + comma(allCount) + ' 项 · 共 12,847 项';
    }
    moreBtn.setAttribute('aria-disabled', exhausted ? 'true' : 'false');
    moreBtn.textContent = exhausted ? '已经到底了' : '载入更早的照片';
    moreNote.textContent = note;
  }

  moreBtn.addEventListener('click', function () {
    if (moreBtn.getAttribute('aria-disabled') === 'true') { return; }
    var added = 0, i;
    if (mode === 'day') {
      for (i = 0; i < 2 && dayCursor < MORE_DAYS.length; i++, dayCursor++) {
        daysBox.insertAdjacentHTML('beforeend', buildDayGroup(MORE_DAYS[dayCursor]));
        added++;
      }
      ORDER['#lb-days'] = Array.prototype.slice.call(daysBox.children);
      decorate(daysBox);
      toast('又找回 ' + added + ' 天');
    } else if (mode === 'month') {
      for (i = 0; i < 2 && monthCursor < MORE_MONTHS.length; i++, monthCursor++) {
        monthsBox.insertAdjacentHTML('beforeend', buildMonthGroup(MORE_MONTHS[monthCursor]));
        added++;
      }
      ORDER['#lb-months'] = Array.prototype.slice.call(monthsBox.children);
      decorate(monthsBox);
      toast('又找回 ' + added + ' 个月');
    } else {
      var next = Math.min(allCount + ALL_STEP, ALL_MAX);
      var html = [];
      for (i = allCount; i < next; i++) { html.push(buildTile(i)); }
      allGrid.insertAdjacentHTML('beforeend', html.join(''));
      allCount = next;
      indexAll();
      decorate(allGrid);
      if (allNote) {
        allNote.textContent = '按时间倒序，一条不漏。当前显示最近的 ' + comma(allCount) + ' 项，共 12,847 项。';
      }
      toast('又载入 ' + comma(ALL_STEP) + ' 项');
    }
    applyFilters();
    updateMoreBar();
  });

  /* ---------------------------------------------------------------------------
     11. 大标题收缩
     --------------------------------------------------------------------------- */

  var head = $('#lb-head');
  var onScroll = throttleRaf(function () {
    if (view.hasAttribute('hidden')) { return; }
    head.classList.toggle('is-compact', (window.scrollY || window.pageYOffset || 0) > 96);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------------------
     12. 键盘
     --------------------------------------------------------------------------- */

  document.addEventListener('keydown', function (e) {
    if (view.hasAttribute('hidden')) { return; }
    if (document.documentElement.classList.contains('lb-open') ||
        document.documentElement.classList.contains('mem-open')) { return; }
    if (e.key !== 'Escape') { return; }
    if (!sortMenu.hasAttribute('hidden')) { closeSortMenu(); sortBtn.focus(); e.preventDefault(); return; }
    if (selecting) { setSelecting(false); e.preventDefault(); return; }
    if (view.classList.contains('is-side-open')) { toggleSide(false); e.preventDefault(); }
  });

  /* ---------------------------------------------------------------------------
     13. Toast
     --------------------------------------------------------------------------- */

  var toastEl = $('#lb-toast');
  var toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-on'); }, reduced() ? 2600 : 2200);
  }

  /* ---------------------------------------------------------------------------
     14. 起手
     --------------------------------------------------------------------------- */

  setMode('day', false);
  syncSelection();
  window.requestAnimationFrame(moveThumb);
  window.setTimeout(moveThumb, 240);
}
