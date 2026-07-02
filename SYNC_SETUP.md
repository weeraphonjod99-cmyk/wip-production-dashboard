# Multi-user schedule sync setup

The dashboard already refreshes Google Sheet source data automatically.
Daily delivery inputs entered inside the web app need a shared Apps Script endpoint so every computer can read and write the same plan.

## Setup

1. Open the Google Sheet used by this dashboard.
2. Go to Extensions > Apps Script.
3. Paste the code from `google-apps-script/schedule-sync.gs`.
4. Deploy > New deployment > Web app.
5. Set Execute as: Me.
6. Set Who has access: Anyone with the link, or Anyone in your organization.
7. Copy the Web app URL.
8. In `app.js`, set:

```js
const REMOTE_SCHEDULE_URL = "PASTE_WEB_APP_URL_HERE";
```

9. Commit and push the change.

After that, all computers using the same GitHub Pages URL will:

- Read FG/WIP/source data from the Google Sheet every 15 seconds.
- Read shared daily delivery plans from Apps Script every 15 seconds.
- Save Delivered, Pending Packing, and day 1-31 edits back to the shared sync sheet.

The Apps Script creates a visible tab named `web_schedule_sync` in the spreadsheet so all users can see the latest shared delivery plan data.
