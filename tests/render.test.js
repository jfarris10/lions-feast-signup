const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../web/render.js');

test('escapeHtml escapes markup', () => {
  assert.equal(R.escapeHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(R.escapeHtml("<script>alert('x')</script>"), '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;');
});

test('parseNote extracts Amazon link and strips it from text', () => {
  assert.deepEqual(R.parseNote('Purchase on Amazon or similar product https://a.co/d/079xC8nI'), {
    text: 'Purchase on Amazon or similar product',
    links: [{ href: 'https://a.co/d/079xC8nI', label: 'View on Amazon ↗' }],
  });
});

test('parseNote drops trailing punctuation from URL', () => {
  assert.equal(R.parseNote('See https://a.co/d/x.').links[0].href, 'https://a.co/d/x');
});

test('parseNote labels other links by domain', () => {
  assert.equal(R.parseNote('Info at https://www.example.org/p').links[0].label, 'example.org ↗');
  assert.equal(R.parseNote('https://smile.amazon.com/dp/1').links[0].label, 'View on Amazon ↗');
});

test('parseNote with no or empty note', () => {
  assert.deepEqual(R.parseNote('no nuts'), { text: 'no nuts', links: [] });
  assert.deepEqual(R.parseNote(''), { text: '', links: [] });
  assert.deepEqual(R.parseNote(undefined), { text: '', links: [] });
});

test('formatTimeRange shares meridiem when same', () => {
  assert.equal(R.formatTimeRange('2026-11-19T09:00:00-08:00', '2026-11-19T09:30:00-08:00'), '9:00–9:30 am');
  assert.equal(R.formatTimeRange('2026-11-19T17:00:00.000Z', '2026-11-19T17:30:00.000Z'), '9:00–9:30 am');
});

test('formatTimeRange shows both meridiems when different', () => {
  assert.equal(R.formatTimeRange('2026-11-19T11:30:00-08:00', '2026-11-19T12:15:00-08:00'), '11:30 am–12:15 pm');
});

test('groupSlots orders sections by first appearance after sorting', () => {
  const g = R.groupSlots([
    { order: 4, section: 'Bring something' },
    { order: 1, section: 'Volunteer' },
    { order: 2, section: 'Volunteer' },
  ]);
  assert.deepEqual(g.map((x) => x.section), ['Volunteer', 'Bring something']);
  assert.deepEqual(g[0].slots.map((s) => s.order), [1, 2]);
});
