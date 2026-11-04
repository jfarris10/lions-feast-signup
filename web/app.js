(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var MOCK = params.get('mock') === '1';
  var STORE = 'lionsSignup';
  var state = { event: null, slots: [], current: null };
  var $ = function (id) { return document.getElementById(id); };

  // ---------- API ----------
  function apiGet(query) {
    if (MOCK) return mockGet(query);
    return fetch(window.API_URL + '?' + new URLSearchParams(query).toString()).then(function (r) { return r.json(); });
  }
  function apiPost(body) {
    if (MOCK) return mockPost(body);
    return fetch(window.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function mockGet(q) {
    if (q.action === 'event') return fetch('mock.json').then(function (r) { return r.json(); });
    if (q.token === 'gone') return Promise.resolve({ ok: true, signup: { slotName: 'Napkins', start: '2026-11-19T17:00:00.000Z', end: '2026-11-19T17:30:00.000Z', displayName: 'Sarah K.', status: 'cancelled' } });
    if (q.token === 'bad') return Promise.resolve({ ok: false, error: 'not_found' });
    return Promise.resolve({ ok: true, signup: { slotName: 'Juice Boxes', start: '2026-11-19T17:00:00.000Z', end: '2026-11-19T17:30:00.000Z', displayName: 'Sarah K.', status: 'active' } });
  }
  function mockPost() { return new Promise(function (res) { setTimeout(function () { res({ ok: true }); }, 500); }); }

  // ---------- Header ----------
  function renderHeader(ev) {
    $('group').textContent = ev.group || '';
    $('title').textContent = ev.title || '';
    document.title = ev.title || document.title;
    $('pills').innerHTML = (ev.headerPills || []).map(function (p) { return '<span>' + escapeHtml(p) + '</span>'; }).join('');
    var paras = String(ev.description || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    $('blurb').textContent = paras[0] || '';
    if (paras.length > 1) {
      $('moreBody').innerHTML = paras.slice(1).map(function (p) {
        var m = p.match(/^([^:]{1,20}):\s*(.*)$/);
        return '<p>' + (m ? '<b>' + escapeHtml(m[1]) + ':</b> ' + escapeHtml(m[2]) : escapeHtml(p)) + '</p>';
      }).join('');
      $('more').hidden = false;
    }
  }

  // ---------- Slots ----------
  function slotHtml(s) {
    var tz = state.event.timezone;
    var full = s.filled >= s.qty;
    var note = parseNote(s.note);
    var pct = s.qty ? Math.min(100, Math.round((s.filled / s.qty) * 100)) : 0;
    var links = note.links.map(function (l) {
      return '<a href="' + escapeHtml(l.href) + '" target="_blank" rel="noopener">' + escapeHtml(l.label) + '</a>';
    }).join('');
    var who = s.names && s.names.length ? ' · ' + escapeHtml(s.names.join(', ')) : '';
    return '<div class="slot' + (full ? ' is-full' : '') + '">' +
      '<div class="grow">' +
        '<div class="t">' + escapeHtml(s.name) + '</div>' +
        '<div class="s">' + escapeHtml(formatTimeRange(s.start, s.end, tz)) + (note.text ? ' · ' + escapeHtml(note.text) : '') + '</div>' +
        (links ? '<div class="links">' + links + '</div>' : '') +
        '<div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
        '<div class="count">' + s.filled + ' of ' + s.qty + who + '</div>' +
      '</div>' +
      (full ? '<span class="full">Full</span>'
            : '<button class="btn" type="button" data-slot="' + escapeHtml(s.slotId) + '" aria-label="Sign up for ' + escapeHtml(s.name) + '">Sign up</button>') +
    '</div>';
  }

  function renderSlots() {
    $('slots').innerHTML = groupSlots(state.slots).map(function (g) {
      return '<h2 class="sec">' + escapeHtml(g.section) + '</h2>' + g.slots.map(slotHtml).join('');
    }).join('');
  }

  function loadError() {
    $('slots').innerHTML = '<div class="notice"><h2>Couldn\'t load the signup</h2><p>Check your connection and try again.</p>' +
      '<div class="stack"><button class="btn" type="button" id="retry">Try again</button></div></div>';
    $('retry').onclick = function () { $('slots').innerHTML = '<div class="sk"></div><div class="sk"></div>'; load(); };
  }

  function load() {
    return apiGet({ action: 'event' }).then(function (res) {
      if (!res || !res.ok) throw new Error('bad');
      state.event = res.event;
      state.slots = res.slots;
      renderHeader(res.event);
      renderSlots();
    }).catch(loadError);
  }

  // ---------- Sheet ----------
  var sheet = $('sheet');
  function openSheet(slotId) {
    var s = state.slots.filter(function (x) { return x.slotId === slotId; })[0];
    if (!s) return;
    state.current = s;
    $('sheetTitle').textContent = s.name;
    $('sheetWhen').textContent = formatTimeRange(s.start, s.end, state.event.timezone) + ' · Thu, Nov 19';
    $('formErr').textContent = '';
    $('f-comment').value = '';
    $('f-hp').value = '';
    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (saved.name) $('f-name').value = saved.name;
      if (saved.email) $('f-email').value = saved.email;
    } catch (e) {}
    $('formView').hidden = false;
    $('okView').hidden = true;
    setBusy(false);
    sheet.showModal();
    setTimeout(function () { ($('f-name').value ? $('f-comment') : $('f-name')).focus(); }, 50);
  }
  function closeSheet() { sheet.close(); }
  function setBusy(b) { $('submitBtn').disabled = b; $('submitBtn').textContent = b ? 'Signing up…' : 'Sign up'; }

  var ERRORS = {
    full: 'Sorry, that spot just filled up.',
    invalid_email: 'Please check your email address.',
    invalid_name: 'Please enter your name.'
  };

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('f-name').value.trim();
    var email = $('f-email').value.trim();
    if (!name) { $('formErr').textContent = ERRORS.invalid_name; $('f-name').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('formErr').textContent = ERRORS.invalid_email; $('f-email').focus(); return; }
    $('formErr').textContent = '';
    setBusy(true);
    try { localStorage.setItem(STORE, JSON.stringify({ name: name, email: email })); } catch (err) {}
    apiPost({ action: 'signup', slotId: state.current.slotId, name: name, email: email,
      comment: $('f-comment').value, hp: $('f-hp').value })
      .then(function (res) {
        setBusy(false);
        if (res && res.ok) {
          $('formView').hidden = true;
          $('okView').hidden = false;
          $('againBtn').focus();
          load();
          return;
        }
        var code = res && res.error;
        $('formErr').textContent = ERRORS[code] || 'Something went wrong. Please try again.';
        if (code === 'full') load();
      })
      .catch(function () { setBusy(false); $('formErr').textContent = 'Something went wrong. Please try again.'; });
  });

  $('cancelBtn').onclick = closeSheet;
  $('doneBtn').onclick = closeSheet;
  $('againBtn').onclick = closeSheet;
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  $('slots').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-slot]');
    if (b) openSheet(b.getAttribute('data-slot'));
  });

  // ---------- Cancel flow ----------
  function homeUrl() { var p = new URLSearchParams(location.search); p.delete('cancel'); var q = p.toString(); return location.pathname + (q ? '?' + q : ''); }

  function cancelView(token) {
    $('slots').hidden = true;
    var box = $('cancel');
    box.hidden = false;
    var back = '<p><a href="' + escapeHtml(homeUrl()) + '">Back to the signup list</a></p>';
    box.innerHTML = '<div class="sk"></div>';
    apiGet({ action: 'signup', token: token }).then(function (res) {
      if (!res || !res.ok) {
        box.innerHTML = '<div class="notice"><h2>Signup not found</h2><p>We couldn\'t find that signup. The link may be incomplete.</p>' + back + '</div>';
        return;
      }
      var s = res.signup;
      var when = formatTimeRange(s.start, s.end, 'America/Los_Angeles');
      if (s.status === 'cancelled') {
        box.innerHTML = '<div class="notice"><h2>Already cancelled</h2><p>This signup was already cancelled.</p>' + back + '</div>';
        return;
      }
      box.innerHTML = '<div class="notice"><h2>Cancel your signup?</h2><p>' + escapeHtml(s.displayName) + ', cancel your signup for <b>' +
        escapeHtml(s.slotName) + '</b> (' + escapeHtml(when) + ')?</p><p class="err" id="cErr" role="alert"></p>' +
        '<div class="stack"><button class="btn" type="button" id="doCancel">Cancel my signup</button>' +
        '<a class="ghost" style="display:flex;align-items:center;justify-content:center" href="' + escapeHtml(homeUrl()) + '">Keep it</a></div></div>';
      $('doCancel').onclick = function () {
        var btn = $('doCancel');
        btn.disabled = true; btn.textContent = 'Cancelling…';
        apiPost({ action: 'cancel', token: token }).then(function (r) {
          if (r && r.ok) {
            box.innerHTML = '<div class="notice"><h2>Cancelled</h2><p>Thanks for letting us know.</p>' + back + '</div>';
          } else if (r && r.error === 'already_cancelled') {
            box.innerHTML = '<div class="notice"><h2>Already cancelled</h2><p>This signup was already cancelled.</p>' + back + '</div>';
          } else {
            btn.disabled = false; btn.textContent = 'Cancel my signup';
            $('cErr').textContent = 'Something went wrong. Please try again.';
          }
        }).catch(function () { btn.disabled = false; btn.textContent = 'Cancel my signup'; $('cErr').textContent = 'Something went wrong. Please try again.'; });
      };
    }).catch(function () {
      box.innerHTML = '<div class="notice"><h2>Couldn\'t load</h2><p>Check your connection and try again.</p>' + back + '</div>';
    });
  }

  var token = params.get('cancel');
  if (token) {
    cancelView(token);
    apiGet({ action: 'event' }).then(function (res) { if (res && res.ok) renderHeader(res.event); }).catch(function () {});
  } else {
    load();
  }
})();
