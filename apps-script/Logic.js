// Pure server logic. Runs in Google Apps Script (as globals) and in Node (tests).

function displayName(full) {
  var parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(input) {
  input = input || {};
  if (input.hp && String(input.hp).trim() !== '') return { ok: false, error: 'bot' };
  var name = String(input.name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 100) return { ok: false, error: 'invalid_name' };
  var email = String(input.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: 'invalid_email' };
  var comment = String(input.comment || '').trim().slice(0, 500);
  return { ok: true, value: { name: name, email: email, comment: comment } };
}

function sheetSafe(s) {
  s = String(s == null ? '' : s);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function countFilled(signups, slotId) {
  return signups.filter(function (s) {
    return String(s.slotId) === String(slotId) && s.status === 'active';
  }).length;
}

function hasCapacity(slot, signups) {
  return countFilled(signups, slot.slotId) < Number(slot.qty);
}

function cancelCheck(signup) {
  if (!signup) return 'not_found';
  if (signup.status === 'cancelled') return 'already_cancelled';
  return 'ok';
}

function reminderTargets(signups, windowStart, now) {
  if (now < windowStart) return [];
  return signups.filter(function (s) {
    return s.status === 'active' && !s.reminderSentAt && new Date(s.timestamp) < windowStart;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { displayName, validateSignup, sheetSafe, countFilled, hasCapacity, cancelCheck, reminderTargets };
}
