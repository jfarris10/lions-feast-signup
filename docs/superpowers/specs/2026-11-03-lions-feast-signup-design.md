# Lion's Friendship Feast Signup: Design

Date: 2026-11-03
Owner: Justin Farris (farris.justin@gmail.com)
Event organizer: Ingrid Farris (ingrid.a.farris@gmail.com)

## Intent

Replace the SignUpGenius sheet for the First Lutheran Lions "Lion's Friendship Feast"
(https://www.signupgenius.com/go/10C0E4AADAB2FABF9C25-67320747-lions) with a signup page
parents can actually use on their phones.

Why: the SignUpGenius version is, in Justin's words, "impossible to use on your phone," lacks flexibility
(for example, Amazon URLs in item notes are plain text instead of links), has very poor usability, and is ad-supported.

The event is **Thursday, Nov 19, 2026**. Parents need the link with enough lead time, so this
should be live within a few days of 2026-11-03.

## Goals

1. Keep the core SignUpGenius features: a parent picks a slot and gives name and email (required)
   plus an optional comment. Parents get a confirmation, a reminder, and can cancel.
2. The owner gets a Google Sheet tracking signups and cancellations, plus an email alert on every
   signup and every cancellation. Alerts go to **both** Justin and Ingrid, and the Sheet is shared with Ingrid.
3. Any URL in a slot note renders as a tappable link.
4. Responsive, modern, phone-first design.
5. Very low cost. Target $0/month.
6. Reusable for the next class event without rebuilding. Justin would accept a one-off if reuse were costlier,
   but the chosen architecture makes reuse nearly free (the event and its slots are data in the Sheet).

## Non-goals

- Social share links (explicitly unwanted).
- An admin UI for creating or editing events. The slots are set ("nothing needs further editing right now").
  Future edits happen directly in the Sheet.
- Payments, waitlists, SMS, calendar invites, user accounts or logins.
- Slot swapping as a distinct feature. Cancel and re-sign-up covers it.

## Anti-goals (failure even if it "works")

- Clunky on a phone: tiny tap targets, horizontal scrolling, pinch-zoom required.
- Any ads, third-party trackers, or Google "this app was created by another user" banners in front of parents.
- Double-booking a slot past its quantity.
- Parents unable to cancel without contacting the organizer.

## Event content (from SignUpGenius, verbatim where it matters)

- Group: First Lutheran Lions
- Title: Lion's Friendship Feast
- Date: Thursday, November 19, 2026. Time zone: America/Los_Angeles.
- Description:
  > We need your help making our Thanksgiving Feast special! We are looking for parent volunteers to help
  > with setup, decorating, clean-up, and bringing food to share. Every little bit helps!
  >
  > Set up: starts at 9 am right after drop off ~9-9:30 am
  >
  > Volunteer: during feast to help students with crafts and food serving etc.
  >
  > Clean up: after feast ends, students will head back to classrooms and we need help putting away tables,
  > food, decor, cleaning up crafts etc.

Slots, in this display order:

| # | Section | Slot | Time | Qty | Note |
|---|---|---|---|---|---|
| 1 | Volunteer | Set Up Volunteers | 9:00–9:30 | 4 | Help arrange tables, chairs, and food stations before the feast |
| 2 | Volunteer | Decorating Volunteers | 9:00–9:30 | 2 | Help decorate the space with festive Thanksgiving decorations and set up crafts |
| 3 | Volunteer | Clean up Volunteers | 11:30–12:15 | 4 | Help clean up tables, decorations, and leftover food after the feast |
| 4 | Bring something | Fresh Fruit Platter | 9:00–9:30 | 4 | |
| 5 | Bring something | Mini Muffins | 9:00–9:30 | 2 | 2 packages of a dozen or enough for both Lion classes |
| 6 | Bring something | Goldfish, Pretzels, or other Kid friendly snacks | 9:00–9:30 | 2 | individual ~ 30 packs or bulk package |
| 7 | Bring something | Napkins | 9:00–9:30 | 1 | Festive Fall Napkins, enough for 40 students |
| 8 | Bring something | Plates | 9:00–9:30 | 1 | Festive plates enough for 40 students |
| 9 | Bring something | Juice Boxes | 9:00–9:30 | 2 | pack of 10 or enough for ~40 kids |
| 10 | Bring something | Cookies or other treats | 9:00–9:30 | 2 | no nuts |
| 11 | Bring something | Crafts | 9:00–9:30 | 1 | Purchase on Amazon or similar product https://a.co/d/079xC8nI |
| 12 | Bring something | Craft | 9:00–9:30 | 1 | Purchase on Amazon or similar item and bring to Feast https://a.co/d/004LmA8E |
| 13 | Bring something | Craft | 9:00–9:30 | 1 | Purchase on Amazon or something similar https://a.co/d/0gzBalyh |

The section grouping (Volunteer vs. Bring something) is new and was approved in the mockup.
At the time of writing there are no existing signups on SignUpGenius to migrate.

## Decided by Justin

- **Look:** the "Warm & festive" direction. Cream background (#FBF3DC), rust header (#B5471B), dark brown text (#4A1A06),
  serif title, white slot cards with a soft gold border. The approved mockup is
  **`docs/mockup.html`** (open it in a browser). Use its lion SVG, header layout and slot-card styling as the source of truth.
  It's a fragment written for the brainstorming frame, so lift its markup and CSS, not the page shell.
  It doesn't show a "Full" slot state or the signup sheet. Design those in the same style.
- **Header:** centered, top to bottom: a cute original lion illustration (an SVG with a round mane, ears, blush and a smile,
  and no leaf or other props), "FIRST LUTHERAN LIONS" in small caps, the title, two pills ("Thu, Nov 19" and
  "Setup 9:00 am"), then a short blurb. Proportional and balanced. The first version's off-center layout was rejected as "rough."
- **Slot list:** grouped into Volunteer and Bring something. Each card shows the name, time, note, a progress bar,
  a "filled of qty" count with signer names, and a Sign up button (or a "Full" state).
- **Links:** URLs in notes are clickable. Amazon short links (`a.co`, `amazon.com`) render as a "View on Amazon ↗" link,
  and other URLs render as links showing their domain. All links open in a new tab.
- **Reminders:** one reminder email, "a few days before." Set for **Monday, Nov 16, 2026, ~8:00 am Pacific**
  (3 days out). The reminder offset is stored in the Sheet so it can change per event.
- **Ownership:** everything (Sheet, Apps Script, hosting) lives under Justin's account. Alerts go to
  farris.justin@gmail.com and ingrid.a.farris@gmail.com. The Sheet is shared with Ingrid as an editor.
- **No social share links, no ads.**

## Architecture (Claude's call, accepted in playback)

- **Front end:** a single static `index.html` (vanilla HTML, CSS and JS, no build step) hosted free on **GitHub Pages**
  under Justin's GitHub account. Mobile-first, so it works well from 320px wide up to desktop (a centered column of ~560px max).
- **Back end:** **Google Apps Script** bound to the Google Sheet, deployed as a web app with "Execute as: me" and
  "Who has access: Anyone." It exposes a small JSON API. The page calls it with `fetch`, using
  `Content-Type: text/plain` POSTs to avoid CORS preflight.
- **Email:** sent from Justin's Gmail via `MailApp` (the consumer quota of ~100 recipients/day is ample).
- **Why not serve the page from Apps Script directly:** that adds Google's warning banner and an iframe that behaves
  poorly on phones, which is an anti-goal.
- **Cost:** $0.

## Data model (Google Sheet)

Three tabs. The schema here is Claude's call, and the builder may adjust column details.

- **Event:** key/value rows: `title`, `group`, `date`, `timezone`, `description`, `headerPills`, `alertEmails`
  (comma-separated), `reminderDaysBefore` (3), `reminderHour` (8), `publicUrl`.
- **Slots:** `slotId`, `order`, `section`, `name`, `start`, `end`, `qty`, `note`.
- **Signups:** `timestamp`, `slotId`, `slotName`, `name`, `email`, `comment`, `status` (`active` or `cancelled`),
  `cancelledAt`, `token` (random, for the cancel link), `reminderSentAt`. Rows are never deleted.
  Cancelling sets the status, so there is a history.

Reuse later means duplicating the Sheet (or the tabs) and editing the Event and Slots tabs.
The way the page picks which event it shows is left to the builder; a `?e=` param or a config constant is fine.

## Behavior

**Viewing:** on load the page fetches the event, slots and filled counts, and shows a skeleton loader while it waits.
Signer names show publicly on filled slots, as SignUpGenius did, displayed as first name + last initial
("Sarah K.", Claude's call to reduce exposure). Emails are never sent to the browser.

**Signing up:** tapping Sign up opens a bottom sheet on mobile (a modal on desktop) showing the slot name and time, with
Name (required), Email (required, validated) and Comment (optional). Name and email are remembered in `localStorage`
so a parent signing up for a second slot doesn't retype them. On submit:
- The server takes a `LockService` lock, rechecks capacity and rejects with a friendly "just filled up" message if the slot is full.
- It appends a Signups row, emails a confirmation to the parent (event, slot, time, note with clickable link, and a cancel link),
  and emails an alert to both owners (who, what slot, the comment, and the slot's new filled count).
- The page shows success with "Sign up for something else," and the list refreshes.
- One slot per submission (Claude's call). A parent may sign up for multiple slots separately and may take more than one
  spot of the same slot by signing up again.
- A hidden honeypot field rejects bots silently. There is no CAPTCHA.

**Cancelling:** the confirmation email links to `<publicUrl>?cancel=<token>`. The page shows the slot details and a
"Cancel my signup" button, and confirming marks the row cancelled, frees the spot, emails the parent a cancellation
confirmation and alerts both owners. An already-cancelled or invalid token shows a clear message.

**Reminder:** a daily time-driven trigger (around `reminderHour` Pacific) emails every `active` signup with no
`reminderSentAt` once the event is within `reminderDaysBefore` days, then stamps `reminderSentAt`. Only signups created
before the window opened (before 8 am Pacific on Nov 16) get a reminder. Later signups get no separate reminder, since their
confirmation is recent, and the trigger must skip them rather than email them the next morning. That's Claude's call.

**Locking:** none. There's no signup cutoff (SignUpGenius didn't show one). The builder may hide Sign up after the event date passes.

## Left to the builder

- File and repo layout. Suggested: `lions-feast-signup/` with `index.html`, `apps-script/Code.gs`, and a `README.md`
  that has step-by-step deploy instructions Justin can follow (create Sheet, paste script, deploy, set trigger, enable Pages).
- A setup function in Apps Script that creates the three tabs and seeds the event and slots above.
- The exact email copy, kept short, warm and plain-text-friendly. HTML email is fine if it degrades well.
- Accessibility basics: real buttons, labels, focus states, 44px tap targets, sufficient contrast.
- Testing approach. At minimum, a manual end-to-end pass: sign up, check the Sheet row and both emails, cancel, run the
  reminder function manually against a test event.
