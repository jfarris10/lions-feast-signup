# Lion's Friendship Feast signup

A phone-friendly, ad-free replacement for the SignUpGenius sheet.

- **Live page:** https://jfarris10.github.io/lions-feast-signup/
- **Data:** the "Lions Feast Signups" Google Sheet in farris.justin@gmail.com's Drive (shared with Ingrid). It has three tabs:
  - **Event:** title, description, alert emails, reminder timing, public URL
  - **Slots:** what people can sign up for
  - **Signups:** every signup. Cancellations are marked `cancelled`, never deleted.
- **Cost:** $0. GitHub Pages hosts the page. Google Apps Script handles the backend, email and the daily reminder trigger.

## How it works

`web/` is a static page that calls the Apps Script web app (`apps-script/`) with `fetch`:

- **Signup:** the parent gets a confirmation email with a personal cancel link. The emails in the Event tab's `alertEmails` get an alert.
- **Cancel:** the link goes to `?cancel=<token>`. The parent confirms, and the slot opens back up. The parent gets a confirmation and the owners get an alert.
- **Reminder:** a daily 8 am Pacific trigger emails everyone who signed up before the reminder window opened. The window opens `reminderDaysBefore` days before the event, so here it's Mon Nov 16 at 8 am.

## Editing

- To change slot wording, quantities or times, edit the **Slots** tab. Changes show on the page immediately.
- To change who gets alerts, edit `alertEmails` on the **Event** tab (comma-separated).

## Code changes

```bash
npm test                                    # pure logic tests
cd apps-script && clasp push -f             # upload backend code
clasp create-deployment -i AKfycbxmxvId8alG-ikpxlhebxWgCpVrQZ-atoIEfMkuc70uLWmDIaOWGPkqMwLEQW0_pS0reQ -d "describe change"
git push                                    # site redeploys via GitHub Actions
```

`apps-script/Secrets.js` holds `ADMIN_KEY` for the key-protected `admin` API action (used for testing). It's gitignored and only exists locally and in Apps Script. Preview the page locally with fake data: `python3 -m http.server -d web 5173`, then open `http://localhost:5173/?mock=1`.

## Reusing for the next event

1. In Drive, **File → Make a copy** of the Sheet. This copies the bound script too.
2. Edit the Event and Slots tabs, and clear the Signups rows below the header.
3. In the copy's Apps Script editor, use **Deploy → New deployment → Web app** (execute as me, access: anyone), then run `installTrigger` once.
4. Copy `web/` to a new repo (or folder), put the new `/exec` URL in `config.js`, and set the Event tab's `publicUrl` to the new page URL.
5. Update the header pills and lion as needed. The pills come from the Event tab's `headerPills` (separate them with `|`).
