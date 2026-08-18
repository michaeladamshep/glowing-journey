// journal.js — turns a "Day N" delineated journal inside #live-content into
// a browsable set of entries: a jump-to list, a random-entry picker, and
// word-count stats. Opt-in: only runs on pages that include the
// #journal-nav markup, so it's inert if ever loaded elsewhere.
//
// Parses live, off the actual rendered DOM (not the baked HTML string), so
// it stays correct as comments.js re-renders #live-content from the Google
// Doc. Re-parses on load and again on the 'live-content:updated' event
// comments.js dispatches after each re-render.
(function () {
  const contentEl = document.getElementById('live-content');
  const navEl      = document.getElementById('journal-nav');
  if (!contentEl || !navEl) return;

  const statsEl    = document.getElementById('journal-stats');
  const listEl     = document.getElementById('journal-entry-list');
  const toggleBtn  = document.getElementById('journal-list-toggle');
  const randomBtn  = document.getElementById('journal-random-btn');

  // A header paragraph is short — "Day 17 Wednesday July 15th." — as
  // opposed to a long sentence that merely mentions "Day N" in passing
  // (e.g. "Day 23 of what? Journaling while unemployed"). 40 chars covers
  // every real header in this journal with room to spare, while excluding
  // in-body mentions.
  const HEADER_RE = /^Day\s+[\d.]+\b/i;
  const MAX_HEADER_LEN = 40;

  let entries = [];
  let lastRandomIndex = -1;

  function parseEntries() {
    const children = Array.from(contentEl.children);
    const found = [];
    let current = null;

    children.forEach((node) => {
      if (node.tagName === 'P') {
        const text = node.textContent.trim();
        if (HEADER_RE.test(text) && text.length <= MAX_HEADER_LEN) {
          const id = 'entry-' + found.length;
          node.id = id;
          current = { id, label: text, nodes: [], wordCount: 0 };
          found.push(current);
          return;
        }
      }
      if (current) current.nodes.push(node);
    });

    found.forEach((e) => {
      const text = e.nodes.map((n) => n.textContent).join(' ').trim();
      e.wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    });

    return found;
  }

  function renderStats() {
    if (!statsEl) return;
    if (!entries.length) {
      statsEl.textContent = '';
      return;
    }
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
    const avgWords = Math.round(totalWords / entries.length);
    const longest = entries.reduce((a, b) => (b.wordCount > a.wordCount ? b : a));
    statsEl.innerHTML = `
      <span><strong>${entries.length}</strong> entries</span>
      <span><strong>${totalWords.toLocaleString()}</strong> words</span>
      <span><strong>${avgWords}</strong> avg / entry</span>
      <span class="journal-stats-longest">longest: ${escapeHtml(longest.label)}</span>
    `;
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = entries.map((e) => `
      <li>
        <a href="#${e.id}" data-entry-id="${e.id}">
          <span class="journal-entry-label">${escapeHtml(e.label)}</span>
          <span class="journal-entry-words">${e.wordCount}w</span>
        </a>
      </li>
    `).join('');

    listEl.querySelectorAll('a[data-entry-id]').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        jumpTo(a.dataset.entryId);
      });
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function jumpTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('journal-entry-flash');
    setTimeout(() => target.classList.remove('journal-entry-flash'), 1600);
  }

  function pickRandomEntry() {
    if (!entries.length) return;
    if (entries.length === 1) return entries[0];
    let idx;
    do {
      idx = Math.floor(Math.random() * entries.length);
    } while (idx === lastRandomIndex);
    lastRandomIndex = idx;
    return entries[idx];
  }

  function refresh() {
    entries = parseEntries();
    renderStats();
    renderList();
    navEl.classList.toggle('journal-nav-empty', entries.length === 0);
  }

  if (toggleBtn && listEl) {
    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!expanded));
      listEl.hidden = expanded;
      toggleBtn.textContent = expanded ? 'Browse all entries' : 'Hide entry list';
    });
  }

  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      const entry = pickRandomEntry();
      if (entry) jumpTo(entry.id);
    });
  }

  document.addEventListener('live-content:updated', refresh);
  document.addEventListener('DOMContentLoaded', refresh);
  // In case this script runs after DOMContentLoaded already fired.
  if (document.readyState !== 'loading') refresh();
})();
