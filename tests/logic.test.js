const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../apps-script/Logic.js');

test('displayName: first name + last initial, trims and collapses', () => {
  assert.equal(L.displayName('  Sarah   Kim '), 'Sarah K.');
  assert.equal(L.displayName('Mary Ann Smith'), 'Mary S.');
  assert.equal(L.displayName('Cher'), 'Cher');
});

test('validateSignup: rejects blank name', () => {
  assert.equal(L.validateSignup({ name: ' ', email: 'a@b.co' }).error, 'invalid_name');
});

test('validateSignup: rejects bad email', () => {
  assert.equal(L.validateSignup({ name: 'A', email: 'nope' }).error, 'invalid_email');
});

test('validateSignup: trims and lowercases email', () => {
  const r = L.validateSignup({ name: 'A', email: ' A@B.CO ', hp: '' });
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'a@b.co');
});

test('validateSignup: honeypot filled is a bot', () => {
  assert.equal(L.validateSignup({ name: 'A', email: 'a@b.co', hp: 'x' }).error, 'bot');
});

test('validateSignup: truncates comment to 500', () => {
  const r = L.validateSignup({ name: 'A', email: 'a@b.co', comment: 'x'.repeat(600) });
  assert.equal(r.value.comment.length, 500);
});

test('sheetSafe: neutralizes formula-leading strings', () => {
  assert.equal(L.sheetSafe('=HYPERLINK("x")'), "'=HYPERLINK(\"x\")");
  assert.equal(L.sheetSafe('+1'), "'+1");
  assert.equal(L.sheetSafe('Sarah'), 'Sarah');
});

const signups = [
  { slotId: '4', status: 'active' },
  { slotId: '4', status: 'cancelled' },
  { slotId: '4', status: 'active' },
];

test('countFilled counts active only', () => {
  assert.equal(L.countFilled(signups, '4'), 2);
});

test('hasCapacity respects qty', () => {
  assert.equal(L.hasCapacity({ slotId: '4', qty: 2 }, signups), false);
  assert.equal(L.hasCapacity({ slotId: '4', qty: 4 }, signups), true);
});

test('cancelCheck outcomes', () => {
  assert.equal(L.cancelCheck(null), 'not_found');
  assert.equal(L.cancelCheck({ status: 'cancelled' }), 'already_cancelled');
  assert.equal(L.cancelCheck({ status: 'active' }), 'ok');
});

const windowStart = new Date('2026-11-16T08:00:00-08:00');
const early = { timestamp: new Date('2026-11-10T12:00:00-08:00'), status: 'active', reminderSentAt: '' };

test('reminderTargets: includes early signup once window opens', () => {
  assert.deepEqual(L.reminderTargets([early], windowStart, new Date('2026-11-16T08:05:00-08:00')), [early]);
});

test('reminderTargets: nothing before window', () => {
  assert.deepEqual(L.reminderTargets([early], windowStart, new Date('2026-11-16T07:59:00-08:00')), []);
});

test('reminderTargets: excludes late, cancelled, already reminded', () => {
  const late = { timestamp: new Date('2026-11-16T09:00:00-08:00'), status: 'active', reminderSentAt: '' };
  const cancelled = { ...early, status: 'cancelled' };
  const reminded = { ...early, reminderSentAt: new Date() };
  assert.deepEqual(
    L.reminderTargets([late, cancelled, reminded], windowStart, new Date('2026-11-17T08:05:00-08:00')),
    []
  );
});
