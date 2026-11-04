// Pure view helpers. Browser globals + Node module (tests).

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function linkLabel(href) {
  var host = '';
  try { host = new URL(href).hostname.toLowerCase(); } catch (e) { return href; }
  host = host.replace(/^www\./, '');
  if (host === 'a.co' || host === 'amzn.to' || host === 'amazon.com' || /\.amazon\.com$/.test(host)) return 'View on Amazon ↗';
  return host + ' ↗';
}

function parseNote(note) {
  var links = [];
  var text = String(note || '').replace(/https?:\/\/[^\s<>"]+/g, function (u) {
    var m = u.match(/^(.*?)([.,;:!?)]*)$/);
    links.push({ href: m[1], label: linkLabel(m[1]) });
    return '';
  });
  return { text: text.replace(/\s+/g, ' ').trim(), links: links };
}

function timeParts(iso, tz) {
  var parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz })
    .formatToParts(new Date(iso));
  var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
  return { hm: get('hour') + ':' + get('minute'), ap: get('dayPeriod').toLowerCase() };
}

function formatTimeRange(startIso, endIso, tz) {
  tz = tz || 'America/Los_Angeles';
  var a = timeParts(startIso, tz);
  var b = timeParts(endIso, tz);
  return (a.ap === b.ap ? a.hm : a.hm + ' ' + a.ap) + '–' + b.hm + ' ' + b.ap;
}

function groupSlots(slots) {
  var sorted = slots.slice().sort(function (x, y) { return x.order - y.order; });
  var groups = [];
  sorted.forEach(function (s) {
    var g = groups.filter(function (x) { return x.section === s.section; })[0];
    if (!g) { g = { section: s.section, slots: [] }; groups.push(g); }
    g.slots.push(s);
  });
  return groups;
}

if (typeof module !== 'undefined') {
  module.exports = { escapeHtml, parseNote, formatTimeRange, groupSlots };
}
