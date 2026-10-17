// The notes site's part of the shared kit: the same top bar, language and theme as Fieldnotes and the games
// (games/kit/ui.css, lang.js, theme.js; storage keys 'fieldnotes.lang' and 'fieldnotes.theme'). This is a plain
// script, not a module, so the site also works opened from disk (the offline plugin).
//
// hooks/i18n.py puts window.__i18n on every page: this page's language, every note/translation pair and the
// Chinese folder titles, and has already sent a reader of the other language to the other version. Here the
// header gets the kit's Notes/Games links and the language and theme buttons; links to notes are pointed at the
// reader's language, with titles to match.
(function () {
  const LANG_KEY = 'fieldnotes.lang';
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
    if (!href || /^(#|[a-z]+:)/i.test(href)) return;
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
    const nav = document.createElement('nav');
    nav.className = 'kit-nav';
    nav.setAttribute('aria-label', tr('站点', 'Site'));
    const home = root() + (lang === 'zh' ? 'index.zh.html' : 'index.html');
    nav.innerHTML = `<a href="${home}" aria-current="page">${tr('笔记', 'Notes')}</a>`
      + `<a href="${root()}game/index.html">${tr('游戏', 'Games')}</a>`;

    const actions = document.createElement('div');
    actions.className = 'kit-actions';
    // The kit's language and theme menus (games/kit/menu.js, published at game/kit/), as on every other page. A
    // language is a different page here, so picking one goes to this page's translation.
    import(root() + 'game/kit/menu.js').then(({ mountBarMenus }) => mountBarMenus(actions, {
      onLang: (next) => {
        try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* the switch still happens for this page */ }
        if (here && here[next]) location.href = absolute(here[next].url) + location.hash;
        else location.reload();
      },
      onTheme: applyTheme,
    })).catch(() => { /* without the kit the page still reads; it just has no menus */ });

    const searchLabel = inner.querySelector('label[for="__search"]');
    (searchLabel || inner.lastElementChild).before(nav);
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

  function start() {
    applyTheme(currentTheme());
    document.querySelectorAll('a[href]').forEach(retarget);
    titleSections();
    translateChrome();
    buildHeader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
