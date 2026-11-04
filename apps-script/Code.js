// Lion's Friendship Feast signup backend. Bound to the "Lions Feast Signups" spreadsheet.
// Uses globals from Logic.js. ADMIN_KEY comes from Secrets.js (gitignored, pushed by clasp).

var TABS = { event: 'Event', slots: 'Slots', signups: 'Signups' };
var SIGNUP_HEADERS = ['timestamp', 'slotId', 'slotName', 'name', 'email', 'comment', 'status', 'cancelledAt', 'token', 'reminderSentAt'];
var SLOT_HEADERS = ['slotId', 'order', 'section', 'name', 'start', 'end', 'qty', 'note'];

var DESCRIPTION = [
  'We need your help making our Thanksgiving Feast special! We are looking for parent volunteers to help with setup, decorating, clean-up, and bringing food to share. Every little bit helps!',
  'Set up: starts at 9 am right after drop off ~9-9:30 am',
  'Volunteer: during feast to help students with crafts and food serving etc.',
  'Clean up: after feast ends, students will head back to classrooms and we need help putting away tables, food, decor, cleaning up crafts etc.'
].join('\n\n');

var SEED_SLOTS = [
  ['Volunteer', 'Set Up Volunteers', '09:00', '09:30', 4, 'Help arrange tables, chairs, and food stations before the feast'],
  ['Volunteer', 'Decorating Volunteers', '09:00', '09:30', 2, 'Help decorate the space with festive Thanksgiving decorations and set up crafts'],
  ['Volunteer', 'Clean up Volunteers', '11:30', '12:15', 4, 'Help clean up tables, decorations, and leftover food after the feast'],
  ['Bring something', 'Fresh Fruit Platter', '09:00', '09:30', 4, ''],
  ['Bring something', 'Mini Muffins', '09:00', '09:30', 2, '2 packages of a dozen or enough for both Lion classes'],
  ['Bring something', 'Goldfish, Pretzels, or other Kid friendly snacks', '09:00', '09:30', 2, 'individual ~ 30 packs or bulk package'],
  ['Bring something', 'Napkins', '09:00', '09:30', 1, 'Festive Fall Napkins, enough for 40 students'],
  ['Bring something', 'Plates', '09:00', '09:30', 1, 'Festive plates enough for 40 students'],
  ['Bring something', 'Juice Boxes', '09:00', '09:30', 2, 'pack of 10 or enough for ~40 kids'],
  ['Bring something', 'Cookies or other treats', '09:00', '09:30', 2, 'no nuts'],
  ['Bring something', 'Crafts', '09:00', '09:30', 1, 'Purchase on Amazon or similar product https://a.co/d/079xC8nI'],
  ['Bring something', 'Craft', '09:00', '09:30', 1, 'Purchase on Amazon or similar item and bring to Feast https://a.co/d/004LmA8E'],
  ['Bring something', 'Craft', '09:00', '09:30', 1, 'Purchase on Amazon or something similar https://a.co/d/0gzBalyh']
];

// ---------- Setup (run once from the editor) ----------

function setup(force) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName(TABS.signups);
  if (existing && existing.getLastRow() > 1 && force !== true) {
    throw new Error('Signups already has data. Run setup(true) to overwrite.');
  }
  ss.setSpreadsheetTimeZone('America/Los_Angeles');

  var ev = getOrCreate_(ss, TABS.event);
  ev.clear();
  ev.getRange(1, 1, 11, 2).setValues([
    ['key', 'value'],
    ['title', "Lion's Friendship Feast"],
    ['group', 'First Lutheran Lions'],
    ['date', '2026-11-19'],
    ['timezone', 'America/Los_Angeles'],
    ['description', DESCRIPTION],
    ['headerPills', 'Thu, Nov 19|Setup 9:00 am'],
    ['alertEmails', 'farris.justin@gmail.com,ingrid.a.farris@gmail.com'],
    ['reminderDaysBefore', 3],
    ['reminderHour', 8],
    ['publicUrl', '']
  ]);
  ev.getRange('B:B').setNumberFormat('@').setWrap(true);
  ev.setColumnWidth(2, 500);

  var sl = getOrCreate_(ss, TABS.slots);
  sl.clear();
  var rows = SEED_SLOTS.map(function (r, i) {
    return [String(i + 1), i + 1, r[0], r[1], pacific_('2026-11-19', r[2]), pacific_('2026-11-19', r[3]), r[4], r[5]];
  });
  sl.getRange(1, 1, 1, SLOT_HEADERS.length).setValues([SLOT_HEADERS]).setFontWeight('bold');
  sl.getRange(2, 1, rows.length, SLOT_HEADERS.length).setValues(rows);
  sl.getRange(2, 5, rows.length, 2).setNumberFormat('yyyy-mm-dd h:mm am/pm');
  sl.setFrozenRows(1);

  var su = getOrCreate_(ss, TABS.signups);
  su.clear();
  su.getRange(1, 1, 1, SIGNUP_HEADERS.length).setValues([SIGNUP_HEADERS]).setFontWeight('bold');
  su.setFrozenRows(1);

  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 3) ss.deleteSheet(def);

  try { ss.addEditor('ingrid.a.farris@gmail.com'); } catch (err) { console.error('addEditor failed: ' + err); }
  installTrigger();
  return 'Setup complete';
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(8).inTimezone('America/Los_Angeles').create();
}

function getOrCreate_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function pacific_(ymd, hm) {
  return Utilities.parseDate(ymd + ' ' + hm, 'America/Los_Angeles', 'yyyy-MM-dd HH:mm');
}

// ---------- Data access ----------

function readEvent_() {
  var values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.event).getDataRange().getValues();
  var ev = {};
  values.slice(1).forEach(function (r) { if (r[0]) ev[String(r[0]).trim()] = r[1]; });
  ev.timezone = ev.timezone || 'America/Los_Angeles';
  ev.date = ev.date instanceof Date ? Utilities.formatDate(ev.date, ev.timezone, 'yyyy-MM-dd') : String(ev.date);
  ev.alertList = String(ev.alertEmails || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  return ev;
}

function readSlots_() {
  var values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.slots).getDataRange().getValues();
  return values.slice(1).filter(function (r) { return r[0] !== ''; }).map(function (r) {
    return { slotId: String(r[0]), order: Number(r[1]), section: String(r[2]), name: String(r[3]),
      start: r[4], end: r[5], qty: Number(r[6]), note: String(r[7] || '') };
  });
}

function signupSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.signups);
}

function readSignups_() {
  var values = signupSheet_().getDataRange().getValues();
  return values.slice(1).map(function (r, i) {
    var o = { row: i + 2 };
    SIGNUP_HEADERS.forEach(function (h, j) { o[h] = r[j]; });
    o.slotId = String(o.slotId);
    o.name = unsafe_(o.name);
    o.comment = unsafe_(o.comment);
    o.slotName = unsafe_(o.slotName);
    return o;
  }).filter(function (s) { return s.token; });
}

function unsafe_(s) {
  s = String(s == null ? '' : s);
  return s; // Sheets strips the leading apostrophe on read; value is already plain text.
}

function setCell_(row, header, value) {
  signupSheet_().getRange(row, SIGNUP_HEADERS.indexOf(header) + 1).setValue(value);
}

// ---------- HTTP ----------

function doGet(e) {
  return respond_(function () {
    var p = (e && e.parameter) || {};
    if (p.action === 'event') return getEvent_();
    if (p.action === 'signup') return lookup_(p.token);
    return { ok: false, error: 'unknown_action' };
  });
}

function doPost(e) {
  return respond_(function () {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'signup') return signup_(body);
    if (body.action === 'cancel') return cancel_(body.token);
    if (body.action === 'admin') return admin_(body);
    return { ok: false, error: 'unknown_action' };
  });
}

function respond_(fn) {
  var out;
  try { out = fn(); } catch (err) { console.error(err && err.stack || err); out = { ok: false, error: 'server' }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function getEvent_() {
  var ev = readEvent_();
  var signups = readSignups_();
  var slots = readSlots_().map(function (s) {
    var active = signups.filter(function (x) { return x.slotId === s.slotId && x.status === 'active'; });
    return { slotId: s.slotId, order: s.order, section: s.section, name: s.name,
      start: iso_(s.start), end: iso_(s.end), qty: s.qty, note: s.note,
      filled: active.length, names: active.map(function (x) { return displayName(x.name); }) };
  });
  return { ok: true,
    event: { title: ev.title, group: ev.group, description: String(ev.description || ''),
      headerPills: String(ev.headerPills || '').split('|').filter(Boolean), timezone: ev.timezone, date: ev.date },
    slots: slots };
}

function iso_(d) { return d instanceof Date ? d.toISOString() : String(d || ''); }

function signup_(body) {
  var v = validateSignup(body);
  if (!v.ok) return v.error === 'bot' ? { ok: true } : v;
  var slot = readSlots_().filter(function (s) { return s.slotId === String(body.slotId); })[0];
  if (!slot) return { ok: false, error: 'no_slot' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var token, filled;
  try {
    var signups = readSignups_();
    if (!hasCapacity(slot, signups)) return { ok: false, error: 'full' };
    token = Utilities.getUuid();
    signupSheet_().appendRow([new Date(), slot.slotId, sheetSafe(slot.name), sheetSafe(v.value.name),
      sheetSafe(v.value.email), sheetSafe(v.value.comment), 'active', '', token, '']);
    SpreadsheetApp.flush();
    filled = countFilled(signups, slot.slotId) + 1;
  } finally {
    lock.releaseLock();
  }

  var ev = readEvent_();
  var s = { name: v.value.name, email: v.value.email, comment: v.value.comment, token: token };
  safeMail_(function () { mailConfirm_(ev, slot, s); });
  safeMail_(function () { mailOwners_(ev, 'New signup: ' + s.name + ' → ' + slot.name + ' (' + filled + '/' + slot.qty + ')',
    s.name + ' (' + s.email + ') signed up for ' + slot.name + ', ' + timeRange_(slot, ev) + '.' +
    (s.comment ? '\n\nComment: ' + s.comment : '') + '\n\nFilled: ' + filled + ' of ' + slot.qty); });
  return { ok: true };
}

function findByToken_(token) {
  if (!token) return null;
  return readSignups_().filter(function (s) { return s.token === String(token); })[0] || null;
}

function lookup_(token) {
  var s = findByToken_(token);
  if (!s) return { ok: false, error: 'not_found' };
  var slot = readSlots_().filter(function (x) { return x.slotId === s.slotId; })[0] || {};
  return { ok: true, signup: { slotName: s.slotName, start: iso_(slot.start), end: iso_(slot.end),
    displayName: displayName(s.name), status: s.status } };
}

function cancel_(token) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var s, slot, filled;
  try {
    s = findByToken_(token);
    var check = cancelCheck(s);
    if (check !== 'ok') return { ok: false, error: check };
    setCell_(s.row, 'status', 'cancelled');
    setCell_(s.row, 'cancelledAt', new Date());
    SpreadsheetApp.flush();
    slot = readSlots_().filter(function (x) { return x.slotId === s.slotId; })[0] || { name: s.slotName, qty: '?' };
    filled = countFilled(readSignups_(), s.slotId);
  } finally {
    lock.releaseLock();
  }
  var ev = readEvent_();
  safeMail_(function () { mailCancelConfirm_(ev, slot, s); });
  safeMail_(function () { mailOwners_(ev, 'Cancellation: ' + s.name + ' dropped ' + slot.name + ' (' + filled + '/' + slot.qty + ')',
    s.name + ' (' + s.email + ') cancelled ' + slot.name + '.\n\nFilled now: ' + filled + ' of ' + slot.qty); });
  return { ok: true };
}

// ---------- Reminders ----------

function reminderWindowStart_(ev) {
  var days = Number(ev.reminderDaysBefore || 3);
  var hour = Number(ev.reminderHour || 8);
  var eventDay = Utilities.parseDate(ev.date + ' 12:00', ev.timezone, 'yyyy-MM-dd HH:mm');
  var day = new Date(eventDay.getTime() - days * 24 * 3600 * 1000);
  var ymd = Utilities.formatDate(day, ev.timezone, 'yyyy-MM-dd');
  return Utilities.parseDate(ymd + ' ' + (hour < 10 ? '0' : '') + hour + ':00', ev.timezone, 'yyyy-MM-dd HH:mm');
}

function sendReminders() {
  var ev = readEvent_();
  var windowStart = reminderWindowStart_(ev);
  var now = new Date();
  if (now < windowStart) return 0;
  var signups = readSignups_();
  var slots = readSlots_();
  var targets = reminderTargets(signups, windowStart, now);
  targets.forEach(function (s) {
    var slot = slots.filter(function (x) { return x.slotId === s.slotId; })[0];
    if (!slot) return;
    safeMail_(function () { mailReminder_(ev, slot, s); });
    setCell_(s.row, 'reminderSentAt', new Date());
  });
  // Late signups (after the window opened) never get a reminder.
  signups.forEach(function (s) {
    if (s.status === 'active' && !s.reminderSentAt && new Date(s.timestamp) >= windowStart) setCell_(s.row, 'reminderSentAt', 'skipped');
  });
  return targets.length;
}

// ---------- Admin (key-protected, used for testing and go-live) ----------

function admin_(body) {
  if (typeof ADMIN_KEY === 'undefined' || !ADMIN_KEY || body.key !== ADMIN_KEY) return { ok: false, error: 'forbidden' };
  if (body.op === 'setEvent') {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.event);
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (vals[i][0] === body.k) { sh.getRange(i + 1, 2).setValue(body.v); return { ok: true }; }
    }
    sh.appendRow([body.k, body.v]);
    return { ok: true };
  }
  if (body.op === 'sendReminders') return { ok: true, sent: sendReminders() };
  if (body.op === 'deleteByEmail') {
    var rows = readSignups_().filter(function (s) { return String(s.email).toLowerCase() === String(body.email).toLowerCase(); })
      .map(function (s) { return s.row; }).sort(function (a, b) { return b - a; });
    rows.forEach(function (r) { signupSheet_().deleteRow(r); });
    return { ok: true, deleted: rows.length };
  }
  if (body.op === 'dump') return { ok: true, event: readEvent_(), signups: readSignups_() };
  return { ok: false, error: 'unknown_op' };
}

// ---------- Email ----------

function safeMail_(fn) { try { fn(); } catch (err) { console.error('mail failed: ' + err); } }

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function linkifyHtml_(text) {
  return esc_(text).replace(/https?:\/\/[^\s<]+/g, function (u) {
    var m = u.match(/^(.*?)([.,;:!?)]*)$/);
    return '<a href="' + m[1] + '" style="color:#B5471B">' + m[1] + '</a>' + m[2];
  });
}

function timeRange_(slot, ev) {
  var tz = ev.timezone;
  var day = Utilities.formatDate(slot.start, tz, 'EEE, MMM d');
  return day + ', ' + Utilities.formatDate(slot.start, tz, 'h:mm a') + '–' + Utilities.formatDate(slot.end, tz, 'h:mm a');
}

function cancelUrl_(ev, token) {
  var base = String(ev.publicUrl || '').trim();
  return base ? base + (base.indexOf('?') >= 0 ? '&' : '?') + 'cancel=' + encodeURIComponent(token) : '';
}

function wrapHtml_(inner) {
  return '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#4A1A06;max-width:520px">' +
    inner + '<p style="color:#8A6A55;font-size:13px;margin-top:24px">First Lutheran Lions · Lion\'s Friendship Feast</p></div>';
}

function slotBlockHtml_(ev, slot) {
  return '<div style="background:#FBF3DC;border:1px solid #F0DDB0;border-radius:12px;padding:12px 14px;margin:12px 0">' +
    '<b>' + esc_(slot.name) + '</b><br>' + esc_(timeRange_(slot, ev)) +
    (slot.note ? '<br><span style="font-size:14px">' + linkifyHtml_(slot.note) + '</span>' : '') + '</div>';
}

function slotBlockText_(ev, slot) {
  return slot.name + '\n' + timeRange_(slot, ev) + (slot.note ? '\n' + slot.note : '');
}

function send_(to, subject, text, html, ev) {
  MailApp.sendEmail({ to: to, subject: subject, body: text, htmlBody: html, name: 'Lions Feast Signup',
    replyTo: ev.alertList[0] || '' });
}

function mailConfirm_(ev, slot, s) {
  var url = cancelUrl_(ev, s.token);
  var subject = "You're signed up: " + slot.name + " · Lion's Friendship Feast";
  var text = 'Hi ' + s.name + ',\n\nThanks for signing up!\n\n' + slotBlockText_(ev, slot) +
    (url ? '\n\nNeed to cancel? ' + url : '') + '\n\nYou\'ll get a reminder a few days before.';
  var html = wrapHtml_('<p>Hi ' + esc_(s.name) + ',</p><p>Thanks for signing up!</p>' + slotBlockHtml_(ev, slot) +
    (url ? '<p>Need to cancel? <a href="' + esc_(url) + '" style="color:#B5471B">Cancel my signup</a></p>' : '') +
    '<p>You\'ll get a reminder a few days before.</p>');
  send_(s.email, subject, text, html, ev);
}

function mailCancelConfirm_(ev, slot, s) {
  var subject = "Cancelled: " + slot.name + " · Lion's Friendship Feast";
  var link = String(ev.publicUrl || '');
  var text = 'Hi ' + s.name + ',\n\nYour signup for ' + slot.name + ' is cancelled. Thanks for letting us know.' +
    (link ? '\n\nWant to pick something else? ' + link : '');
  var html = wrapHtml_('<p>Hi ' + esc_(s.name) + ',</p><p>Your signup for <b>' + esc_(slot.name) +
    '</b> is cancelled. Thanks for letting us know.</p>' +
    (link ? '<p><a href="' + esc_(link) + '" style="color:#B5471B">Pick something else</a></p>' : ''));
  send_(s.email, subject, text, html, ev);
}

function mailReminder_(ev, slot, s) {
  var url = cancelUrl_(ev, s.token);
  var subject = "Reminder: Lion's Friendship Feast is Thu, Nov 19";
  var text = 'Hi ' + s.name + ',\n\nA quick reminder that you signed up for:\n\n' + slotBlockText_(ev, slot) +
    (url ? '\n\nCan\'t make it anymore? ' + url : '') + '\n\nThank you!';
  var html = wrapHtml_('<p>Hi ' + esc_(s.name) + ',</p><p>A quick reminder that you signed up for:</p>' + slotBlockHtml_(ev, slot) +
    (url ? '<p>Can\'t make it anymore? <a href="' + esc_(url) + '" style="color:#B5471B">Cancel my signup</a></p>' : '') +
    '<p>Thank you!</p>');
  send_(s.email, subject, text, html, ev);
}

function mailOwners_(ev, subject, text) {
  if (!ev.alertList.length) return;
  var link = String(ev.publicUrl || '');
  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var full = text + '\n\nSheet: ' + sheetUrl + (link ? '\nSignup page: ' + link : '');
  MailApp.sendEmail({ to: ev.alertList.join(','), subject: subject, body: full, name: 'Lions Feast Signup' });
}
