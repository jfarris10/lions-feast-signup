# Lion's Friendship Feast Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phone-first, ad-free signup page for the Nov 19 feast, backed by a Google Sheet with email confirmations, cancellations, owner alerts and one reminder. The target is live within ~1 hour.

**Architecture:** A static `web/` folder (vanilla HTML, CSS and JS) is served by GitHub Pages and calls a Google Apps Script web app (bound to a Sheet, executing as Justin) over `fetch`. Pure logic lives in plain `.js` files that run in both Node (tests) and Apps Script / the browser. Apps Script glue and DOM code are verified manually.

**Tech Stack:** Vanilla JS, Node 20+ `node:test` (no deps), Google Apps Script (V8), `@google/clasp` for pushing, the `gh` CLI for GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-03-lions-feast-signup-design.md`. The approved visual is `docs/mockup.html`.

## Global Constraints

- Cost: $0. No paid services and no npm runtime dependencies in `web/`.
- No social share links, ads, trackers, or third-party scripts/fonts on the page.
- Colors: background `#FBF3DC`, header `#B5471B`, text `#4A1A06`, card border `#F0DDB0`, bar fill `#D9822B`. Serif (Georgia) title.
- Header, top to bottom: lion SVG (from `docs/mockup.html`, no leaf), "FIRST LUTHERAN LIONS" small caps, title, pills "Thu, Nov 19" / "Setup 9:00 am", blurb.
- Alert emails: `farris.justin@gmail.com, ingrid.a.farris@gmail.com`. Sheet shared with `ingrid.a.farris@gmail.com` as editor.
- Time zone `America/Los_Angeles`. Reminder: 3 days before, 8 am → **Mon Nov 16 2026 08:00 PST**.
- Public names render as first name + last initial. Emails are never returned to the browser.
- Tap targets ≥ 44px. The layout works at 320px, and content column max is 560px.
- The page never calls Apps Script `HtmlService`. It's static only (avoids Google's banner).

## Review Focus

1. Two parents take the last spot at the same moment → the second gets "Sorry, that spot just filled up," and qty is never exceeded (LockService plus `hasCapacity` recheck inside the lock). *Task 2 manual check.*
2. A name or comment containing `<script>` or starting with `=`/`+`/`-`/`@` → shown as literal text on the page and in emails, and stored in the Sheet as text, not a formula. *Tests in Tasks 1 and 3.*
3. A note URL followed by punctuation (`...https://a.co/d/x.`) → the link works, and the trailing `.` is not part of the href. *Test in Task 3.*
4. The cancel link is opened again after cancelling, or the token is mangled → a clear "already cancelled" / "link not found" message with no error page. *Test in Task 1 (`cancelCheck`).*
5. A signup after Mon 8 am → no reminder the next morning. Earlier signups get exactly one. *Test in Task 1 (`reminderTargets`).*

---

## File Structure

```
lions-feast-signup/
  package.json                 # "test": "node --test tests/"
  apps-script/
    appsscript.json            # V8, timeZone America/Los_Angeles, webapp executeAs USER_DEPLOYING, access ANYONE_ANONYMOUS
    .clasp.json                # created by clasp (scriptId), committed
    Logic.js                   # pure server logic (Node + GAS)
    Code.js                    # doGet/doPost router, Sheet I/O, setup, emails, reminder trigger
  web/
    index.html                 # markup + CSS (from mockup)
    render.js                  # pure view helpers (Node + browser)
    app.js                     # fetch, DOM, sheet/modal, cancel view
    config.js                  # window.API_URL = "<Apps Script /exec URL>"
  tests/
    logic.test.js
    render.test.js
  README.md                    # deploy + reuse steps
```

Dual-environment pattern for `Logic.js` and `render.js`: plain top-level `function` declarations, ending with
`if (typeof module !== 'undefined') module.exports = { ... };`

### API contract (shared by Tasks 2 and 4)

All responses are JSON. Errors come back as `{ ok:false, error:<code> }` with HTTP 200.

| Call | Request | Response |
|---|---|---|
| Load | `GET ?action=event` | `{ ok:true, event:{title, group, description, headerPills:string[], timezone}, slots:[{slotId, order, section, name, start, end, qty, note, filled, names:string[]}] }`. `start`/`end` are ISO strings with offset. |
| Sign up | `POST` body (text/plain) `{"action":"signup", slotId, name, email, comment, hp}` | `{ok:true}` or error `invalid_name`, `invalid_email`, `full`, `no_slot` |
| Look up | `GET ?action=signup&token=T` | `{ok:true, signup:{slotName, start, end, displayName, status}}` or `not_found` |
| Cancel | `POST {"action":"cancel", token}` | `{ok:true}` or `not_found`, `already_cancelled` |

---

### Task 1: Repo + server pure logic

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules`, `.superpowers`), `apps-script/Logic.js`, `tests/logic.test.js`

**Interfaces:**
- Produces (in `Logic.js`):
  - `displayName(full: string) -> string`: first word + last word's initial with "."; a single word is returned as-is; trims and collapses spaces.
  - `validateSignup({name, email, comment, hp}) -> {ok:true, value:{name, email, comment}} | {ok:false, error:'invalid_name'|'invalid_email'|'bot'}`: trims; name 1–100 chars; email matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` and is lowercased; comment truncated to 500; non-empty `hp` → `'bot'`.
  - `sheetSafe(s: string) -> string`: prefixes `'` when it starts with `= + - @`.
  - `countFilled(signups: Signup[], slotId: string) -> number`: counts `status==='active'` only.
  - `hasCapacity(slot: {slotId, qty}, signups: Signup[]) -> boolean`
  - `cancelCheck(signup: Signup|null) -> 'ok'|'not_found'|'already_cancelled'`
  - `reminderTargets(signups: Signup[], windowStart: Date, now: Date) -> Signup[]`: empty if `now < windowStart`; else active, no `reminderSentAt`, `timestamp < windowStart`.
  - Type `Signup = {timestamp: Date, slotId, slotName, name, email, comment, status, cancelledAt, token, reminderSentAt}`

- [ ] **Step 1:** `git init` in `/Users/justin/Code/lions-feast-signup`. Create `package.json` (`{"name":"lions-feast-signup","private":true,"scripts":{"test":"node --test tests/"}}`) and `.gitignore`.
- [ ] **Step 2: Write failing tests** in `tests/logic.test.js` (`require('../apps-script/Logic.js')`):
  - `displayName('  Sarah   Kim ') === 'Sarah K.'`, `displayName('Mary Ann Smith') === 'Mary S.'`, `displayName('Cher') === 'Cher'`
  - `validateSignup({name:' ', email:'a@b.co'}).error === 'invalid_name'`; `validateSignup({name:'A', email:'nope'}).error === 'invalid_email'`; `validateSignup({name:'A', email:' A@B.CO ', hp:''}).value.email === 'a@b.co'`; `hp:'x'` → `'bot'`; a 600-char comment → `value.comment.length === 500`
  - `sheetSafe('=HYPERLINK("x")') === "'=HYPERLINK(\"x\")"`, `sheetSafe('Sarah') === 'Sarah'`
  - With signups `[{slotId:'4',status:'active'},{slotId:'4',status:'cancelled'},{slotId:'4',status:'active'}]`: `countFilled(...,'4') === 2`; `hasCapacity({slotId:'4',qty:2}, ...) === false`; `hasCapacity({slotId:'4',qty:4}, ...) === true`
  - `cancelCheck(null) === 'not_found'`, `cancelCheck({status:'cancelled'}) === 'already_cancelled'`, `cancelCheck({status:'active'}) === 'ok'`
  - `windowStart = new Date('2026-11-16T08:00:00-08:00')`: a signup at `2026-11-10` that is active with no `reminderSentAt` is included when `now = 2026-11-16T08:05-08:00`; not included when `now = 2026-11-16T07:59-08:00`; a signup at `2026-11-16T09:00-08:00` is excluded at `now = 2026-11-17T08:05-08:00`; cancelled and already-reminded signups are excluded.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module/functions missing).
- [ ] **Step 4:** Implement `apps-script/Logic.js` per Interfaces.
- [ ] **Step 5:** Run `npm test`. Expected: all pass.
- [ ] **Step 6:** Commit `feat: server pure logic` (also add the existing `docs/`).

### Task 2: Apps Script backend (Sheet, API, emails, reminder)

**Files:**
- Create: `apps-script/appsscript.json`, `apps-script/Code.js`

**Interfaces:**
- Consumes: everything in Task 1's `Logic.js` (global in GAS).
- Produces: the API contract above, plus these GAS entry points: `setup()`, `doGet(e)`, `doPost(e)`, `sendReminders()`, `installTrigger()`, `testEmails()`.

- [ ] **Step 1: `setup()`** creates or overwrites three tabs in the bound spreadsheet:
  - **Event** (key | value): `title`=Lion's Friendship Feast, `group`=First Lutheran Lions, `date`=2026-11-19, `timezone`=America/Los_Angeles, `description`=spec description verbatim (newlines kept), `headerPills`=`Thu, Nov 19|Setup 9:00 am`, `alertEmails`=`farris.justin@gmail.com,ingrid.a.farris@gmail.com`, `reminderDaysBefore`=3, `reminderHour`=8, `publicUrl`=(blank, filled in Task 5)
  - **Slots** with headers `slotId, order, section, name, start, end, qty, note` and the 13 rows from the spec table. `slotId` = order as a string. Sections are `Volunteer` (1–3) and `Bring something` (4–13). start/end are real Date cells on 2026-11-19 (Pacific).
  - **Signups** with headers `timestamp, slotId, slotName, name, email, comment, status, cancelledAt, token, reminderSentAt`, frozen header row.
  It also shares the spreadsheet with Ingrid (`addEditor`). Guard: refuse to run if Signups has data rows unless called as `setup(true)`.
- [ ] **Step 2: Router.** `doGet` handles `action=event|signup`. `doPost` parses `e.postData.contents` as JSON and handles `signup|cancel`. Every response goes through `ContentService.createTextOutput(JSON.stringify(x)).setMimeType(JSON)`. Wrap handlers in try/catch → `{ok:false,error:'server'}`, and log with `console.error`.
- [ ] **Step 3: signup handler.** Run `validateSignup` (`'bot'` → return `{ok:true}` without writing). Take `LockService.getScriptLock().waitLock(10000)`, re-read Signups, check `no_slot`/`full` via `hasCapacity`, append a row (each text field through `sheetSafe`, `token = Utilities.getUuid()`, `status='active'`), flush, release. Then send emails outside the lock.
- [ ] **Step 4: cancel and look-up handlers.** Find the row by token, run `cancelCheck`, then set `status='cancelled'` and `cancelledAt=new Date()` (under lock). Look-up returns `displayName`, never the email.
- [ ] **Step 5: Emails** (`MailApp.sendEmail` with `htmlBody` and a plain `body`; HTML-escape every user-provided string). Subjects:
  - Parent confirmation: `You're signed up: <slotName> · Lion's Friendship Feast`. The body has the slot, time, note (URLs as `<a>`), and `Need to cancel? <publicUrl>?cancel=<token>`.
  - Owner alert: `New signup: <name> → <slotName> (<filled>/<qty>)`, including the comment.
  - Parent cancel confirmation: `Cancelled: <slotName> · Lion's Friendship Feast`.
  - Owner cancel alert: `Cancellation: <name> dropped <slotName> (<filled>/<qty>)`.
  - Reminder: `Reminder: Lion's Friendship Feast is Thu, Nov 19`. It has the slot, time, note links and the cancel link.
  Use `name: 'Lions Feast Signup'` and `replyTo` = the first alert email.
- [ ] **Step 6: Reminders.** `sendReminders()` computes `windowStart` = event date minus `reminderDaysBefore` days at `reminderHour` in the event time zone (`Utilities.parseDate`). It calls `reminderTargets`, emails each target, and stamps `reminderSentAt`. Late signups (timestamp ≥ windowStart) get `reminderSentAt='skipped'` so they're never reconsidered. `installTrigger()` deletes existing triggers for `sendReminders`, then creates `ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(8).inTimezone('America/Los_Angeles')`.
- [ ] **Step 7: `appsscript.json`:** `{"timeZone":"America/Los_Angeles","runtimeVersion":"V8","exceptionLogging":"STACKDRIVER","webapp":{"executeAs":"USER_DEPLOYING","access":"ANYONE_ANONYMOUS"},"oauthScopes":["https://www.googleapis.com/auth/spreadsheets.currentonly","https://www.googleapis.com/auth/script.send_mail","https://www.googleapis.com/auth/script.scriptapp","https://www.googleapis.com/auth/drive"]}`. The Drive scope is for `addEditor`.
- [ ] **Step 8:** Run `npm test`. Expected: still passes (Code.js isn't loaded by tests). Commit `feat: apps script backend`.
  *Manual verification of this task happens in Task 5 Step 3 (after deploy).*

### Task 3: View helpers

**Files:**
- Create: `web/render.js`, `tests/render.test.js`

**Interfaces:**
- Produces:
  - `escapeHtml(s: string) -> string` (escapes `& < > " '`)
  - `parseNote(note: string) -> {text: string, links: {href, label}[]}`: extracts `https?://` URLs, strips trailing `.,;:!?)` from each, and removes URLs from `text` (trimmed). The label is `'View on Amazon ↗'` for hosts `a.co`, `amzn.to` or `*amazon.com`; otherwise `<hostname without www.> ↗`.
  - `formatTimeRange(startIso, endIso, tz='America/Los_Angeles') -> string` via `Intl.DateTimeFormat`, e.g. `'9:00–9:30 am'`, `'11:30 am–12:15 pm'`. Drop the meridiem on the start when both share it.
  - `groupSlots(slots) -> {section, slots}[]`: sorted by `order`, with sections in order of first appearance.

- [ ] **Step 1: Write failing tests:**
  - `escapeHtml('<b>"x"</b>') === '&lt;b&gt;&quot;x&quot;&lt;/b&gt;'`
  - `parseNote('Purchase on Amazon or similar product https://a.co/d/079xC8nI')` → `{text:'Purchase on Amazon or similar product', links:[{href:'https://a.co/d/079xC8nI', label:'View on Amazon ↗'}]}`
  - `parseNote('See https://a.co/d/x.').links[0].href === 'https://a.co/d/x'`
  - `parseNote('Info at https://www.example.org/p').links[0].label === 'example.org ↗'`
  - `parseNote('no nuts')` → `{text:'no nuts', links:[]}`; `parseNote('')` → `{text:'', links:[]}`
  - `formatTimeRange('2026-11-19T09:00:00-08:00','2026-11-19T09:30:00-08:00') === '9:00–9:30 am'`; `formatTimeRange('2026-11-19T11:30:00-08:00','2026-11-19T12:15:00-08:00') === '11:30 am–12:15 pm'`
  - `groupSlots([{order:4,section:'Bring something'},{order:1,section:'Volunteer'},{order:2,section:'Volunteer'}]).map(g=>g.section)` deep-equals `['Volunteer','Bring something']`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `web/render.js`.
- [ ] **Step 4:** Run `npm test`. Expected: all pass. Commit `feat: view helpers`.

### Task 4: Page UI

**Files:**
- Create: `web/index.html`, `web/app.js`, `web/config.js`, `web/mock.json`

**Interfaces:**
- Consumes: the API contract; `escapeHtml`, `parseNote`, `formatTimeRange`, `groupSlots` (browser globals from `render.js`).
- Produces: `window.API_URL` in `config.js`. With `?mock=1`, `app.js` reads `mock.json` (same shape as `GET ?action=event`, with set-up 2/4 filled and Plates 1/1 full) and fakes POSTs as `{ok:true}`.

- [ ] **Step 1: `index.html`.** Lift the header and card CSS and markup from `docs/mockup.html` (lion SVG verbatim). The structure is `<header>`, `<main id="slots">` (skeleton cards while loading), `<dialog id="sheet">` (a bottom sheet under 640px, a centered modal above), and `<section id="cancel" hidden>`. Load scripts in order: `config.js`, `render.js`, `app.js`. Add `<meta name="viewport" content="width=device-width,initial-scale=1">`, a lion-emoji favicon via an SVG data URI, and `<title>Lion's Friendship Feast</title>`.
- [ ] **Step 2: Slot cards.** Each card shows the name, `formatTimeRange`, the note text, links (`target="_blank" rel="noopener"`), a progress bar, `"{filled} of {qty}"`, names joined with ", ", and a Sign up button. Full slots get a muted card and a disabled `Full` pill. The Volunteer and Bring something section headings come from `groupSlots`. All user strings go through `escapeHtml` or `textContent`.
- [ ] **Step 3: Signup sheet.** It shows the slot name and time, Name*, Email* (`type=email`, `autocomplete=email`), Comment (optional, placeholder "Anything Ingrid should know?"), and a hidden honeypot `hp` input (offscreen and `tabindex=-1`, not `display:none`). Name and email are prefilled from `localStorage['lionsSignup']`. While submitting, the button is disabled and reads "Signing up…". On `ok`, the sheet shows "You're signed up! Check your email for a confirmation." with buttons "Sign up for something else" (closes and reloads slots) and "Done". Error messages:
  - `full`: "Sorry, that spot just filled up." (and the list reloads)
  - `invalid_email`: "Please check your email address."
  - `invalid_name`: "Please enter your name."
  - other: "Something went wrong. Please try again."
- [ ] **Step 4: Cancel view.** With `?cancel=TOKEN`, hide `#slots`, call look-up, and show "{displayName}, cancel your signup for {slotName} ({time})?" with a [Cancel my signup] button and a "Keep it" link that goes to the list without the param. Results:
  - Done: "Cancelled. Thanks for letting us know." plus a link back to the list.
  - `already_cancelled`: "This signup was already cancelled."
  - `not_found`: "We couldn't find that signup. The link may be incomplete."
- [ ] **Step 5: Verify in a browser.** Run `npx serve web -l 5173` (or `python3 -m http.server -d web 5173`). Open `http://localhost:5173/?mock=1` with chrome-devtools at 375×812 and at 1280×800, and take a screenshot of each. Check: the header matches the mockup, Amazon links open, Plates shows Full, the sheet opens and submits to the success state, there's no horizontal scroll at 320px, and the console has no errors. Also check `?cancel=x&mock=1` renders the cancel view. Mock look-up returns a fixture signup; mock token `gone` returns `already_cancelled`.
- [ ] **Step 6:** Commit `feat: signup page UI`.

### Task 5: Deploy, wire up, end-to-end

**Files:**
- Modify: `web/config.js`, `README.md` (create)

Several steps need Justin's Google or GitHub auth. Ask him to run commands prefixed with `!` when prompted.

- [ ] **Step 1: Sheet + script.** Justin creates a blank Google Sheet named "Lions Feast Signups" and opens Extensions → Apps Script, and gives the script ID (Project Settings). Install `npm i -g @google/clasp`. Justin runs `! clasp login`, and enables the Apps Script API at https://script.google.com/home/usersettings if prompted. Write `apps-script/.clasp.json` with `{"scriptId":"<id>","rootDir":"."}`, then run `cd apps-script && clasp push -f`.
  *Fallback if clasp fails:* Justin pastes `Logic.js`, `Code.js` and the manifest into the editor manually.
- [ ] **Step 2: Initialize.** In the editor, Justin runs `setup`, approves the scopes, then runs `installTrigger`. Expected: three tabs with 13 slots, Ingrid added as editor, and one daily trigger listed.
- [ ] **Step 3: Deploy the web app.** Use Deploy → New deployment → Web app, execute as Me, access Anyone. Copy the `/exec` URL into `web/config.js`. Verify with `curl -sL "<exec>?action=event" | head -c 400`. Expected: `{"ok":true,"event":{"title":"Lion's Friendship Feast"...`, with 13 slots that are all `filled:0`.
- [ ] **Step 4: GitHub Pages.** Run `gh auth status`; if not logged in, Justin runs `! gh auth login`. Add `.github/workflows/pages.yml` (on push to `main`: `actions/configure-pages`, `actions/upload-pages-artifact` with `path: web`, `actions/deploy-pages`; permissions `pages: write`, `id-token: write`). Branch Pages can't serve `/web`, so the workflow publishes it. Then run `gh repo create lions-feast-signup --public --source . --push` and `gh api -X POST repos/{owner}/lions-feast-signup/pages -f build_type=workflow`, and re-run the workflow if the first push raced Pages enablement. Expected: the URL `https://<owner>.github.io/lions-feast-signup/` loads. Set Event `publicUrl` to that URL in the Sheet. The repo is public, but it holds no secrets. The /exec URL is public by design.
- [ ] **Step 5: End-to-end on a real phone (or devtools mobile).** Sign up for "Napkins" as `Test Parent` with Justin's email. Expected: the card shows 1 of 1 / Full, there's a Signups row, Justin gets a confirmation and both owners get an alert. Open the cancel link from the email → cancel → the row shows `cancelled`, both alerts arrive, and the slot is open again. Open the cancel link again → "already cancelled". Test the reminder: temporarily set Event `date` to tomorrow and `reminderDaysBefore`=1, add a test signup, run `sendReminders` manually → one reminder email; run again → none. Restore the Event values and **delete the test rows**.
- [ ] **Step 6: README.md.** Cover the deploy steps above, how to reuse for a new event (duplicate the Sheet + script via File → Make a copy, edit the Event and Slots tabs, redeploy, update `config.js` or add a new site folder), and note that `clasp push` + "Manage deployments → edit → new version" is needed after code changes.
- [ ] **Step 7:** Commit `chore: deploy config + README` and push. Send Justin the live URL.
