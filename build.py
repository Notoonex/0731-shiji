#!/usr/bin/env python3
"""把 src/ 下的模块片段合并成单文件 index.html。用法：python3 build.py"""
import os, re

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(ROOT_DIR, "src")
PARTS = S
ROOT = ROOT_DIR

CSS_ORDER = ["shell", "hero", "memories", "people", "shelf", "library", "messages", "overlays", "login", "talks"]
JS_ORDER = CSS_ORDER
INITS = ["initShell", "initHero", "initMemories", "initPeopleTrips",
         "initShelf", "initLibrary", "initMessages", "initOverlays", "initLogin", "initTalks"]


def read(p):
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def strip_fence(t):
    t = t.strip()
    t = re.sub(r"^```[a-zA-Z]*\s*\n", "", t)
    t = re.sub(r"\n```\s*$", "", t)
    return t.strip()


def clean_html(t):
    t = strip_fence(t)
    t = re.sub(r"<!DOCTYPE[^>]*>", "", t, flags=re.I)
    t = re.sub(r"</?(?:html|head|body)[^>]*>", "", t, flags=re.I)
    return t.strip()


def split_out(t, tag):
    blocks = re.findall(r"<%s[^>]*>(.*?)</%s>" % (tag, tag), t, flags=re.I | re.S)
    rest = re.sub(r"<%s[^>]*>.*?</%s>" % (tag, tag), "", t, flags=re.I | re.S)
    return rest, "\n".join(blocks)


mods = {}
extra_css, extra_js = [], []
for k in CSS_ORDER:
    h = clean_html(read(f"{PARTS}/{k}.html"))
    h, ic = split_out(h, "style")
    h, ij = split_out(h, "script")
    if ic.strip():
        extra_css.append(ic)
    if ij.strip():
        extra_js.append(ij)
    mods[k] = h.strip()

# ---------- talks 拆段（一个文件，四段用 SPLIT 标记分开）----------
tk = {}
for chunk in mods["talks"].split("<!--SPLIT:"):
    if ":" not in chunk and "-->" not in chunk:
        continue
    name, _, rest = chunk.partition("-->")
    if name.strip():
        tk[name.strip()] = rest.strip()
assert set(tk) >= {"gather", "highlight", "view", "overlay"}, f"talks 分段缺失: {sorted(tk)}"

# ---------- 组装 body ----------
shell = mods["shell"]

home_inner = "\n\n".join([
    mods["hero"], mods["memories"],
    tk["gather"],                      # 聚会：紧跟「最近的日子」
    mods["people"],
    tk["highlight"],                   # 名场面：地点之后，从图切到文
    mods["shelf"],
])
new_home, n1 = re.subn(
    r'(<section[^>]*id="view-home"[^>]*>)\s*(</section>)',
    lambda m: m.group(1) + "\n" + home_inner + "\n" + m.group(2),
    shell, count=1)
assert n1 == 1, "未找到 view-home 空容器"
shell = new_home

shell, n_talk = re.subn(r'(<section[^>]*id="view-talks"[^>]*>)\s*(</section>)',
                        lambda m: m.group(1) + "\n" + tk["view"] + "\n" + m.group(2),
                        shell, count=1)
assert n_talk == 1, "未找到 view-talks 容器"

for key, vid in (("library", "view-library"), ("messages", "view-messages")):
    shell, n = re.subn(r'<section[^>]*id="%s"[^>]*>\s*</section>' % vid,
                       lambda m: mods[key], shell, count=1)
    assert n == 1, f"未找到 {vid} 空容器"

body = (shell
        + "\n\n<!-- ============ 全屏叠层 ============ -->\n" + mods["overlays"]
        + "\n\n<!-- ============ 登录 ============ -->\n" + mods["login"]
        + "\n\n<!-- ============ 聚会详情 ============ -->\n" + tk["overlay"])

# ---------- CSS / JS ----------
css = "\n\n".join(
    [read(S + "/tokens.css"), read(S + "/motion.css")]
    + [f"/* ========== {k} ========== */\n{strip_fence(read(f'{PARTS}/{k}.css'))}" for k in CSS_ORDER]
    + extra_css
)
# 收尾兜底：[hidden] 是属性选择器（0,0,1,0），会被同特异性的类选择器压过。
# 放在所有模块 CSS 之后、用双属性提高到 (0,0,2,0)，避免逐个模块打补丁。
css += """

/* ========== 收尾：确保 hidden 始终生效 ========== */
[hidden][hidden] { display: none; }
"""

js = "\n\n".join(
    [read(S + "/motion.js")]
    + [f"/* ========== {k} ========== */\n{strip_fence(read(f'{PARTS}/{k}.js'))}" for k in JS_ORDER]
    + extra_js
)

boot = """
/* ========== 启动 ========== */
(function () {
  var INITS = %s;
  function boot() {
    INITS.forEach(function (name) {
      try {
        var fn = window[name];
        if (typeof fn === 'function') fn();
        else console.warn('[boot] 缺少初始化函数:', name);
      } catch (e) { console.error('[boot] ' + name + ' 抛错:', e); }
    });
    document.documentElement.classList.add('is-booted');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
""" % str(INITS).replace("'", '"')

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
           "%3Crect width='32' height='32' rx='8' fill='%230B0B0D'/%3E"
           "%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23F5F5F7' stroke-width='1.6'/%3E"
           "%3Ccircle cx='16' cy='16' r='3' fill='%230A84FF'/%3E%3C/svg%3E")

doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B0B0D">
<meta name="description" content="0731 史记 — 把微信群里的照片、视频、语音、文件和对话长期保存下来，并自动整理成可以回看的记忆。">
<title>0731 史记 · 老友记的八年</title>
<link rel="icon" href="{FAVICON}">
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{js}
{boot}
</script>
</body>
</html>
"""

out = ROOT + "/index.html"
open(out, "w", encoding="utf-8").write(doc)
print(f"index.html 生成完毕：{len(doc)/1024:.0f} KB")
print(f"  CSS {len(css)/1024:.0f} KB / JS {len(js)/1024:.0f} KB / HTML {len(body)/1024:.0f} KB")
