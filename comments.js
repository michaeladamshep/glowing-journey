// comments.js — live Google Doc sync + inline comments, shared across content pages.
// Each page defines `PAGE_SLUG` in an inline <script> before this file, and
// `DOC_ID` too if it's still a work-in-progress piece synced from a Google
// Doc. Finished pieces omit `DOC_ID`: comments.js then skips doc polling
// entirely and only powers inline comments on the page's own static content.
(function () {
  const POLL_MS = 60000;
  const SUPABASE_URL = 'https://hhpxtwbmdjhbrynrwxjh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_0FF74VRP57uQg5QIgenqIw_VLrlcJQD';
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyR6KR2mxJeuQW8thQU4y23IyPO5ObP8aBtK2_jpgvFqLXby6oB_-AZywNZdTFgZQ9BvA/exec';
  const AUTHOR_STORAGE_KEY = 'comment_author_name';

  const dot            = document.getElementById('live-dot');
  const statusEl       = document.getElementById('live-status');
  const contentEl      = document.getElementById('live-content');
  const lastUpdEl      = document.getElementById('last-updated');
  const addBtn         = document.getElementById('comment-add-btn');
  const popover        = document.getElementById('comment-popover');
  const formOverlay    = document.getElementById('comment-form-overlay');
  const selectedPreview = document.getElementById('comment-selected-preview');
  const authorInput    = document.getElementById('comment-author');
  const commentInput   = document.getElementById('comment-text');
  const submitBtn      = document.getElementById('comment-submit');
  const cancelBtn      = document.getElementById('comment-cancel');
  const progressBar    = document.getElementById('read-progress');

  if (!contentEl) return;

  // A page is "live" only if it declared DOC_ID. Finished pieces leave it
  // out on purpose (see header comment).
  const isLive = typeof DOC_ID !== 'undefined' && !!DOC_ID;

  let prevHtml = '';
  let prevText = '';
  let failCount = 0;
  let currentComments = [];
  let pendingAnchor = '';

  // --- Supabase ---

  async function fetchComments() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/comments?doc_id=eq.${PAGE_SLUG}&order=created_at.asc`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (!res.ok) return;
      currentComments = await res.json();
      renderContent();
      renderCommentPanel();
    } catch (e) {}
  }

  async function postComment(anchorText, commentText, authorName) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        doc_id: PAGE_SLUG,
        anchor_text: anchorText,
        comment_text: commentText,
        author_name: authorName || 'Anonymous'
      })
    });
    return res.ok;
  }

  // --- Rendering ---

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(str, n) {
    return str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
  }

  // --- Toast — feedback that a post/delete actually happened, since the
  // affected highlight can be off-screen or (if its anchor overlaps another
  // comment's) never render as a highlight at all. ---

  let toastEl = null;
  let toastTimer = null;
  function showToast(message, isError) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'comment-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.className = isError ? 'error' : '';
    // Reflow before adding 'visible' so the transition replays on repeat toasts.
    void toastEl.offsetWidth;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3000);
  }

  // --- All-comments panel — the only highlighted text is discoverable by
  // scrolling past it, so this gives a full list of every comment on the
  // page (including ones whose highlight got skipped for overlapping
  // another). Built dynamically so pages don't need to hand-add markup. ---

  let panelEl, panelListEl, toggleBtn, toggleCountEl;

  function buildCommentPanel() {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'comment-panel-toggle';
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = '💬 <span id="comment-panel-count">0</span>';
    toggleBtn.addEventListener('click', () => panelEl.classList.toggle('visible'));
    document.body.appendChild(toggleBtn);
    toggleCountEl = toggleBtn.querySelector('#comment-panel-count');

    panelEl = document.createElement('div');
    panelEl.id = 'comment-panel';
    panelEl.innerHTML =
      '<div class="comment-panel-header"><span>Comments</span>' +
      '<button id="comment-panel-close" type="button" aria-label="Close">&times;</button></div>' +
      '<div id="comment-panel-list"></div>';
    document.body.appendChild(panelEl);
    panelListEl = panelEl.querySelector('#comment-panel-list');
    panelEl.querySelector('#comment-panel-close').addEventListener('click', () => panelEl.classList.remove('visible'));
  }

  function renderCommentPanel() {
    if (!toggleBtn) return;
    toggleCountEl.textContent = currentComments.length;
    toggleBtn.style.display = currentComments.length ? 'flex' : 'none';

    if (!currentComments.length) {
      panelListEl.innerHTML = '<p class="comment-panel-empty">No comments yet.</p>';
      return;
    }

    const sorted = [...currentComments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    panelListEl.innerHTML = sorted.map(c => `
      <div class="comment-panel-item" data-anchor="${encodeURIComponent(c.anchor_text)}">
        <div class="popover-author">${escapeHtml(c.author_name)}</div>
        <div class="comment-panel-anchor">“${escapeHtml(truncate(c.anchor_text, 80))}”</div>
        <div class="popover-text">${escapeHtml(c.comment_text)}</div>
        <div class="popover-time">${new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
      </div>
    `).join('');

    panelListEl.querySelectorAll('.comment-panel-item').forEach(item => {
      item.addEventListener('click', e => {
        // Without this, the click bubbles to the document-level listener
        // that closes the popover on any outside click, undoing the
        // showPopover() call below in the same tick.
        e.stopPropagation();
        const encodedAnchor = item.dataset.anchor;
        const target = contentEl.querySelector(`.comment-highlight-wrap[data-anchor="${encodedAnchor}"]`);
        if (!target) {
          showToast('That comment isn’t highlighted in the text — its selection overlaps another comment.');
          return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const anchor = decodeURIComponent(encodedAnchor);
        showPopover(target, currentComments.filter(c => c.anchor_text === anchor));
        panelEl.classList.remove('visible');
      });
    });
  }

  function renderContent() {
    if (!prevHtml) return;
    contentEl.innerHTML = prevHtml;
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let t = '', n;
    while ((n = walker.nextNode())) t += n.textContent;
    prevText = t;
    applyCommentHighlights();
    // Lets other optional scripts (e.g. journal.js) react whenever
    // #live-content is replaced, without this file knowing about them.
    document.dispatchEvent(new CustomEvent('live-content:updated'));
  }

  // Comments store no position, only the anchor text — so each anchor is
  // matched against its first occurrence only. Matching every occurrence
  // (the old behavior) lit up every instance of common words/phrases
  // across the whole page.
  function applyCommentHighlights() {
    const anchors = new Map();
    for (const c of currentComments) {
      if (!anchors.has(c.anchor_text)) anchors.set(c.anchor_text, []);
      anchors.get(c.anchor_text).push(c);
    }
    if (!anchors.size) return;

    const ranges = [];
    for (const [anchorText] of anchors) {
      const pos = prevText.indexOf(anchorText);
      if (pos === -1) continue;
      ranges.push({ start: pos, end: pos + anchorText.length, anchorText });
    }
    if (!ranges.length) return;

    // Apply end-to-start so earlier positions stay valid. Skip any range
    // that overlaps one already applied — nesting a highlight span inside
    // another produces broken/duplicate DOM (including empty phantom marks).
    ranges.sort((a, b) => b.start - a.start);
    const applied = [];
    for (const r of ranges) {
      if (applied.some(a => r.start < a.end && r.end > a.start)) continue;
      applyHighlight(r.anchorText, r.start, r.end);
      applied.push(r);
    }

    attachHighlightListeners();
  }

  function buildTextNodeMap() {
    const map = [];
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let pos = 0, node;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      map.push({ node, start: pos, end: pos + len });
      pos += len;
    }
    return map;
  }

  const BLOCK_TAGS = new Set(['UL', 'OL', 'DIV', 'BODY', 'HTML']);

  function applyHighlight(anchorText, start, end) {
    const map = buildTextNodeMap();
    const startEntry = map.find(e => start >= e.start && start < e.end);
    const endEntry   = map.find(e => end   >  e.start && end   <= e.end);
    if (!startEntry || !endEntry) return;
    try {
      const range = document.createRange();
      range.setStart(startEntry.node, start - startEntry.start);
      range.setEnd(endEntry.node,     end   - endEntry.start);

      // Skip if the range spans multiple block-level containers — wrapping
      // an inline span around block elements breaks layout.
      const ancestor = range.commonAncestorContainer;
      if (ancestor === contentEl || (ancestor.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(ancestor.tagName))) return;

      const mark = document.createElement('mark');
      mark.className = 'comment-highlight';
      mark.appendChild(range.extractContents());
      const wrap = document.createElement('span');
      wrap.className = 'comment-highlight-wrap';
      wrap.dataset.anchor = encodeURIComponent(anchorText);
      wrap.appendChild(mark);
      range.insertNode(wrap);
    } catch (e) {}
  }

  // Click/tap to open a highlight's comments — works uniformly on mouse
  // and touch (touch has no hover state to rely on).
  function attachHighlightListeners() {
    contentEl.querySelectorAll('.comment-highlight-wrap').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const allAnchors = [];
        let node = e.currentTarget;
        while (node && node !== contentEl) {
          if (node.classList && node.classList.contains('comment-highlight-wrap')) {
            allAnchors.push(decodeURIComponent(node.dataset.anchor));
          }
          node = node.parentElement;
        }
        const comments = currentComments.filter(c => allAnchors.includes(c.anchor_text));
        if (!comments.length) return;
        showPopover(e.currentTarget, comments);
      });
    });
  }

  document.addEventListener('click', e => {
    if (popover.style.display !== 'block') return;
    if (popover.contains(e.target) || e.target.closest('.comment-highlight-wrap')) return;
    popover.style.display = 'none';
  });

  // --- Google Doc polling ---

  function setStatus(state) {
    dot.className = 'live-dot ' + state;
    statusEl.textContent = { connecting: 'Connecting…', live: 'Live', disconnected: 'Disconnected — retrying…' }[state] || state;
  }

  async function fetchDoc() {
    try {
      const res = await fetch(`${SCRIPT_URL}?docId=${DOC_ID}&_t=${Date.now()}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      failCount = 0;
      setStatus('live');

      if (data.title) document.title = data.title + ' — Head Gone Wrong by Noise';

      const html = (data.html || '').trim();
      if (html && html !== prevHtml) {
        prevHtml = html;
        renderContent();
      }

      if (data.ts) lastUpdEl.textContent = 'Last synced: ' + new Date(data.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (err) {
      failCount++;
      if (failCount >= 3) setStatus('disconnected');
    }
  }

  // --- Popover ---

  function showPopover(el, comments) {
    popover.innerHTML = comments.map((c, i) => `
      ${i > 0 ? '<hr class="popover-divider">' : ''}
      <div class="popover-comment">
        <div class="popover-author">${escapeHtml(c.author_name)}</div>
        <div class="popover-text">${escapeHtml(c.comment_text)}</div>
        <div class="popover-time">${new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
      </div>
    `).join('');

    popover.style.display = 'block';
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 16));
    popover.style.top = top + 'px';
    popover.style.left = left + 'px';
  }

  // --- Selection (mouse + touch, via selectionchange so both fire the
  // same path — touch has no mouseup/mouseenter equivalent) ---

  let selectionTimer = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(handleSelection, 150);
  });

  function handleSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentEl.contains(sel.anchorNode)) {
      addBtn.style.display = 'none';
      return;
    }
    const text = sel.toString().trim();
    if (!text) { addBtn.style.display = 'none'; return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    addBtn.style.display = 'block';
    const btnW = addBtn.offsetWidth || 80;
    addBtn.style.top = (rect.top - 38) + 'px';
    addBtn.style.left = Math.min(
      window.innerWidth - btnW - 8,
      Math.max(8, rect.left + rect.width / 2 - btnW / 2)
    ) + 'px';
    pendingAnchor = text;
  }

  addBtn.addEventListener('click', () => {
    addBtn.style.display = 'none';
    window.getSelection()?.removeAllRanges();
    selectedPreview.textContent = pendingAnchor;
    authorInput.value = localStorage.getItem(AUTHOR_STORAGE_KEY) || '';
    commentInput.value = '';
    formOverlay.classList.add('visible');
    commentInput.focus();
  });

  cancelBtn.addEventListener('click', () => formOverlay.classList.remove('visible'));

  formOverlay.addEventListener('click', e => {
    if (e.target === formOverlay) formOverlay.classList.remove('visible');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') formOverlay.classList.remove('visible');
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && formOverlay.classList.contains('visible')) {
      e.preventDefault();
      submitBtn.click();
    }
  });

  submitBtn.addEventListener('click', async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting…';
    const authorName = authorInput.value.trim();
    const ok = await postComment(pendingAnchor, text, authorName);
    if (ok) {
      if (authorName) localStorage.setItem(AUTHOR_STORAGE_KEY, authorName);
      formOverlay.classList.remove('visible');
      await fetchComments();
      showToast('Comment added.');
    } else {
      showToast('Couldn’t post that comment — try again.', true);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post';
  });

  // --- Progress bar ---
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    });
  }

  // --- Init ---
  buildCommentPanel();
  if (isLive) {
    setStatus('connecting');
    fetchDoc();
    setInterval(fetchDoc, POLL_MS);
  } else {
    // Finished page, no doc to poll — treat the page's own baked-in
    // content as the fixed "prevHtml" so renderContent() can still (re)run
    // to apply comment highlights, without ever touching #live-content
    // again after this.
    prevHtml = contentEl.innerHTML;
    renderContent();
  }
  fetchComments();
  setInterval(fetchComments, 30000);
})();
