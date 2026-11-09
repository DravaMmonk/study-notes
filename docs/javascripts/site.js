// The notes site's part of the shared kit: the same top bar, language and theme as Fieldnotes and the games
// (games/kit/ui.css, lang.js, theme.js; storage keys 'fieldnotes.lang' and 'fieldnotes.theme'). This is a plain
// script, not a module, so the site also works opened from disk (the offline plugin).
//
// hooks/i18n.py puts window.__i18n on every page: this page's language, every note/translation pair and the
// Chinese folder titles, and has already sent a reader of the other language to the other version. Here the
// header gets the language and theme buttons; links to notes are pointed at the
// reader's language, with titles to match.
//
// Bilingual reading (notes only, 'fieldnotes.bilingual'): the page stays in the reader's language and the other
// version is fetched and spliced in block by block, each Chinese block followed by its English one.
(function () {
  const LANG_KEY = 'fieldnotes.lang';
  const BI_KEY = 'fieldnotes.bilingual';
  const THEME_KEY = 'fieldnotes.theme';
  const data = window.__i18n || { lang: null, pairs: [], sections: {} };

  function preferred() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === 'zh' || stored === 'en') return stored;
    } catch (e) { /* fall through */ }
    return /^zh\b/i.test(navigator.language || '') ? 'zh' : 'en';
  }
  const lang = preferred();
  const tr = (zh, en) => (lang === 'en' ? en : zh);
  const bilingual = (() => { try { return localStorage.getItem(BI_KEY) === '1'; } catch (e) { return false; } })();

  const configNode = document.getElementById('__config');
  const base = new URL(configNode ? JSON.parse(configNode.textContent).base || '.' : '.', location.href);
  // A page's address without query or hash, with a folder read as its index.html.
  const key = (href) => href.split('#')[0].split('?')[0].replace(/\/$/, '/index.html');
  const absolute = (url) => key(new URL(url, base).href);

  // Every URL of a pair → the pair, so a link to either version can be pointed at the reader's.
  const byUrl = new Map();
  data.pairs.forEach((pair) => Object.values(pair).forEach(({ url }) => byUrl.set(absolute(url), pair)));
  const here = byUrl.get(key(location.href));

  function retarget(link) {
    const href = link.getAttribute('href');
    if (!href || /^(#|mailto:|javascript:)/i.test(href)) return;
    const pair = byUrl.get(key(new URL(href, location.href).href));
    if (!pair || !pair[lang]) return;
    const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
    link.setAttribute('href', absolute(pair[lang].url) + hash);
    // Nav entries, tabs and the footer carry the page title; give them the title in this language.
    // Only where the link shows a page title: a folder's tab or nav entry links to its first page but keeps its name.
    const title = pair[lang].title;
    if (!title || !link.closest('.md-nav, .md-tabs, .md-footer')) return;
    const label = link.querySelector('.md-ellipsis') || link;
    const shown = label.textContent.trim();
    if (!Object.values(pair).some((version) => version.title === shown)) return;
    const text = /^index(\.zh)?\.html$/.test(pair[lang].url) && link.closest('.md-tabs') ? tr('首页', 'Home') : title;
    if (label === link) setText(link, text);
    else label.textContent = text;
  }

  // Replace an element's own text, keeping its icons and child elements.
  function setText(node, text) {
    const textNode = [...node.childNodes].reverse().find((child) => child.nodeType === 3 && child.textContent.trim());
    if (textNode) textNode.textContent = ` ${text} `;
  }

  // Folder titles in the nav and tabs come from hooks/i18n.py in English; put in the Chinese ones.
  function titleSections() {
    if (lang !== 'zh') return;
    document.querySelectorAll('.md-nav__link .md-ellipsis, .md-nav__title, .md-tabs__link').forEach((node) => {
      const text = node.textContent.trim();
      if (data.sections[text]) setText(node, data.sections[text]);
    });
  }

  // ---- theme: the kit's three themes; Material's own scheme follows light or dark ----
  const currentTheme = () => document.documentElement.dataset.theme || 'paper';
  function applyTheme(id) {
    document.documentElement.dataset.theme = id;
    document.body.setAttribute('data-md-color-scheme', id === 'paper' ? 'default' : 'slate');
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* applies for this visit */ }
  }

  function root() { return base.href.replace(/\/?$/, '/'); }

  function buildHeader() {
    const inner = document.querySelector('.md-header__inner');
    if (!inner) return;
    const actions = document.createElement('div');
    actions.className = 'kit-actions';
    // The kit's language and theme menus are packaged with the notes at assets/kit/. A
    // language is a different page here, so picking one goes to this page's translation.
    import(root() + 'assets/kit/menu.js').then(({ mountBarMenus }) => mountBarMenus(actions, {
      onLang: (next) => {
        try {
          if (next === 'bi') localStorage.setItem(BI_KEY, '1');
          else { localStorage.removeItem(BI_KEY); localStorage.setItem(LANG_KEY, next); }
        } catch (e) { /* the switch still happens for this page */ }
        const target = next !== 'bi' && here && here[next] ? absolute(here[next].url) : null;
        if (target && target !== key(location.href)) location.href = target + location.hash;
        else location.reload();
      },
      lang: { now: () => (bilingual ? 'bi' : lang), extra: [{ id: 'bi', label: '中英双语' }] },
      onTheme: applyTheme,
    })).catch(() => { /* without the kit the page still reads; it just has no menus */ });

    inner.append(actions);
  }

  function translateChrome() {
    const site = tr('学习笔记', 'Study Notes');
    const topic = document.querySelector('.md-header__topic:first-child .md-ellipsis');
    if (topic) topic.textContent = site;
    const drawerTitle = document.querySelector('.md-nav--primary > .md-nav__title');
    if (drawerTitle && drawerTitle.lastChild) drawerTitle.lastChild.textContent = ` ${site} `;
    document.title = document.title.replace(/ - Drava's Study Notes$/, ` · ${site}`);
    const input = document.querySelector('.md-search__input');
    if (input) { input.placeholder = tr('搜索笔记', 'Search notes'); input.setAttribute('aria-label', input.placeholder); }
    const toc = document.querySelector('label.md-nav__title[for="__toc"]');
    if (toc && toc.lastChild) toc.lastChild.textContent = tr('本页目录', 'On this page');
    const top = document.querySelector('.md-top');
    if (top && top.lastChild) top.lastChild.textContent = tr('回到顶部', 'Back to top');
    document.querySelectorAll('.md-footer__direction').forEach((node) => {
      node.textContent = /prev/i.test(node.closest('a')?.className || '') ? tr('上一篇', 'Previous') : tr('下一篇', 'Next');
    });
  }

  // A level of a notes edition (<!-- task: game/level -->, hooks/ui.py; games/DESIGN.md 12.1): the game's page,
  // embedded in the page's language, as tall as it says it is.
  function embedTasks() {
    const frames = [...document.querySelectorAll('iframe.task-embed[data-game]')];
    frames.forEach((frame) => {
      const url = new URL('index.html', frame.dataset.game);
      url.search = new URLSearchParams({ embed: '', level: frame.dataset.level, lang: data.lang === 'en' ? 'en' : 'zh' });
      frame.src = url.href;
    });
    window.addEventListener('message', (event) => {
      const frame = frames.find((f) => f.contentWindow === event.source);
      if (frame && event.data && event.data.kit === 'kit-embed-height') frame.style.height = `${event.data.height}px`;
    });
  }

  // ---- bilingual reading ----
  const ARTICLE = 'article.md-content__inner';
  const HEADING = /^H[1-6]$/;
  // Blocks shown once: code, diagrams, display maths and embeds read the same in both languages.
  const SHARED = 'pre, .highlight, .mermaid, .arithmatex, iframe, hr';

  const blocks = (article) => [...article.children].filter((el) => !el.matches('script, style, .md-content__button, .md-source-file'));

  // The text a reader sees, without maths (typeset on this page, raw in the fetched one).
  function prose(el) {
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.arithmatex, mjx-container').forEach((m) => m.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  // Split at headings; when both versions have the same headings, blocks pair up within each section,
  // so a paragraph added on one side shifts only its own section.
  function sections(list) {
    return list.reduce((acc, el) => {
      if (!acc.length || HEADING.test(el.tagName)) acc.push([]);
      acc[acc.length - 1].push(el);
      return acc;
    }, []);
  }
  function pairUp(mine, theirs) {
    const a = sections(mine), b = sections(theirs);
    const aligned = a.length === b.length && a.every((s, i) => s[0].tagName === b[i][0].tagName);
    const groups = aligned ? a.map((s, i) => [s, b[i]]) : [[mine, theirs]];
    return groups.flatMap(([x, y]) => Array.from({ length: Math.max(x.length, y.length) }, (_, i) => [x[i] || null, y[i] || null]));
  }

  // A block of the other version, made to live on this page: no duplicate ids, links resolved from where it came.
  function adopt(el, from, otherLang) {
    const node = document.importNode(el, true);
    node.querySelectorAll('.headerlink').forEach((a) => a.remove());
    [node, ...node.querySelectorAll('[id]')].forEach((n) => n.removeAttribute('id'));
    node.querySelectorAll('[href], [src]').forEach((n) => ['href', 'src'].forEach((attr) => {
      const v = n.getAttribute(attr);
      if (v && !/^(#|[a-z]+:)/i.test(v)) n.setAttribute(attr, new URL(v, from).href);
    }));
    node.querySelectorAll('a[href]').forEach(retarget);
    node.lang = otherLang === 'zh' ? 'zh-CN' : 'en';
    return node;
  }

  function spliceTranslation() {
    const other = { zh: 'en', en: 'zh' }[data.lang];
    const article = document.querySelector(ARTICLE);
    if (!bilingual || !other || !here || !here[other] || !article) return;
    const from = absolute(here[other].url);
    fetch(from)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((html) => {
        const theirs = new DOMParser().parseFromString(html, 'text/html').querySelector(ARTICLE);
        if (!theirs) return;
        const added = [];
        let last = null;
        pairUp(blocks(article), blocks(theirs)).forEach(([mine, alt]) => {
          if (!alt || alt.matches(SHARED) || alt.querySelector('.mermaid, iframe') || (mine && prose(mine) === prose(alt))) {
            last = mine || last;
            return;
          }
          const node = adopt(alt, from, other);
          added.push(node);
          const [zh, en] = other === 'en' ? [mine, node] : [node, mine];
          en?.classList.add('bi-en');
          if (zh && en) zh.classList.add('bi-lead');
          if (!mine) (last ? last.after(node) : article.append(node));
          else if (other === 'en') mine.after(node);
          else mine.before(node);
          last = other === 'en' || !mine ? node : mine;
        });
        const mj = window.MathJax;
        if (added.length && mj && mj.typesetPromise) (mj.startup?.promise || Promise.resolve()).then(() => mj.typesetPromise(added));
      })
      .catch(() => { /* opened from disk or offline: the page reads in one language */ });
  }

  function start() {
    applyTheme(currentTheme());
    spliceTranslation();
    embedTasks();
    document.querySelectorAll('a[href]').forEach(retarget);
    titleSections();
    translateChrome();
    buildHeader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
