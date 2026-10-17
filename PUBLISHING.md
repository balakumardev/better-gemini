# Better Gemini - Chrome Web Store Publishing Guide

## Store Listing Details

### Extension Name (75 characters max; the store shows the manifest `name`)
```
Better Gemini: Wide Chat, Keyboard Shortcuts, Markdown Export
```

### Short Description (132 characters max; the store shows the manifest `description`)
```
Wider chat and tables, 20+ keyboard shortcuts, Markdown export, default model, and 'gem' address-bar launch for Google Gemini.
```

### Detailed Description (Plain text, no Markdown/HTML)
```
Better Gemini adds missing controls to gemini.google.com. It runs only on Gemini pages, and each feature has its own on/off switch.

FEATURES

Wide chat and tables
Gemini can keep replies in a narrow column. Better Gemini lets the conversation, your messages, the prompt box and tables use up to 98% of the available width, so wide tables and code are easier to read. Where Gemini already shows chats at full width, the change is smaller.

Quick launch from the address bar
Type gem in the address bar, press Tab or Space, type your prompt and press Enter. Gemini opens with the prompt already sent. Enter uses the current tab. Alt+Enter (Option+Enter on Mac) opens a new tab. Ctrl+Enter (Cmd+Enter on Mac) opens a background tab.

20+ keyboard shortcuts
Press Cmd+Shift+? (Ctrl+Shift+? on Windows and Linux) on Gemini to see the full list. Examples:
- Cmd/Ctrl+Shift+O: new chat
- Cmd/Ctrl+B: show or hide the sidebar
- Alt+1 to Alt+9: open the 1st to 9th chat in the sidebar
- Cmd/Ctrl+Shift+;: copy the last code block
- Cmd/Ctrl+Shift+C: copy the last response
- Cmd/Ctrl+Shift+K: stop or start generation
- Shift+Esc: focus the prompt box

Export a full chat
An Export button sits above the prompt box. Click it to copy the whole conversation as Markdown or download it as a .md file named after the chat.

Default model and thinking level
Choose a preferred model (Flash-Lite, Flash, Thinking or Pro) and a thinking level (Standard or Extended) on the options page. Better Gemini selects them when a chat opens. A choice your account does not offer is skipped.

PRIVACY
- Runs only on gemini.google.com.
- No analytics, no tracking, no ads, and no data sent to the developer.
- Your prompts and replies are read only inside the page, when you use a copy or export feature. They are not stored or sent anywhere.
- Your settings (feature switches, preferred model, thinking level) are saved with Chrome's storage API. Chrome can sync them across the browsers you are signed in to.
- Source code (MIT license): https://github.com/balakumardev/better-gemini

Better Gemini is an independent project. It is not affiliated with or endorsed by Google. Gemini is a trademark of Google LLC.

Built by Bala Kumar (balakumar.dev)
```

### Category
```
Productivity
```

### Language
```
English
```

---

## Permission Justifications

Manifest today: permissions `["activeTab", "storage"]`, host_permissions `["https://gemini.google.com/*"]`, omnibox keyword `gem`.

**Single purpose:** Add reading, navigation and export tools to the Google Gemini website: wider chat, keyboard shortcuts, Markdown export, a default model setting and address-bar launch.

| Permission | Justification |
|------------|---------------|
| `storage` | Saves the user's settings (which features are on, preferred model, thinking level) with chrome.storage.sync. Nothing else is stored. |
| `https://gemini.google.com/*` (host permission) | The content scripts run only on Gemini pages. They widen the layout, add the Export button, handle shortcuts and select the default model. The extension has no access to any other site. |
| `activeTab` | Declared for the address-bar quick launch (type `gem`), which opens Gemini in the current tab. The content scripts are declared statically in the manifest and do not depend on it. |
| Omnibox keyword `gem` | Needs no permission. It opens `https://gemini.google.com/app?bg_prompt=<text>` through chrome.tabs.update / tabs.create. |

The extension does not declare `scripting`. Do not claim it in the listing, README or privacy policy.

**Remote code:** No. All JavaScript is in the package.

**Privacy practices tab** (check the console wizard wording yourself): no data is transmitted off the device. The export and copy features read conversation text inside the page when the user clicks, and keep it local. If the wizard counts local reading of "Website content" as handling, declare it and say it is not transmitted. Certify: no selling, no unrelated use, no creditworthiness use. Keep the existing privacy policy URL; the policy text was updated on 2026-10-17.

---

## Required Assets

### Icons (Already Present)
- `icons/icon16.png` - 16x16 px (toolbar)
- `icons/icon48.png` - 48x48 px (extensions page)
- `icons/icon128.png` - 128x128 px (Chrome Web Store)

### Screenshots (1280x800, min 1, max 5)
Create screenshots showing:
1. **Wider Chat** - Before/after comparison of chat width
2. **Export Button** - Floating "Export Chat" button in action
3. **Keyboard Shortcuts** - The help popup (Cmd+Shift+?)
4. **Popup UI** - The extension popup with toggles
5. **Options Page** - The full settings page

### Promotional Images (Optional but Recommended)
- Small tile: 440x280 px
- Marquee: 1400x560 px

---

## Publishing Steps

### 1. Prepare the Package

```bash
# From the better-gemini directory, create a ZIP excluding dev files
cd /Users/bkumara/personal/better-gemini
zip -r better-gemini-v1.0.0.zip . \
  -x "*.git*" \
  -x "tests/*" \
  -x "scripts/*" \
  -x "*.md" \
  -x "*.sh" \
  -x ".DS_Store" \
  -x "node_modules/*"
```

### 2. Chrome Web Store Developer Dashboard

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay the one-time $5 developer registration fee (if not already paid)

### 3. Create New Item

1. Click "New Item"
2. Upload the ZIP file created in step 1
3. Fill in the store listing:
   - **Name**: Better Gemini: Wide Chat, Keyboard Shortcuts, Markdown Export
   - **Summary**: Use the short description above
   - **Description**: Use the detailed description above
   - **Category**: Productivity
   - **Language**: English

### 4. Upload Assets

1. Upload all required screenshots (min 1, max 5)
2. Upload promotional images if prepared
3. Set the primary category

### 5. Privacy Practices

Fill out the privacy section:
- **Single Purpose**: Enhance Google Gemini with productivity features (wider chat, export, shortcuts, model selection)
- **Permission Justifications**: Copy from the table above
- **Data Usage**:
  - Does not collect user data
  - Does not transmit data to external servers
  - Settings only, saved with chrome.storage.sync (Chrome may sync them across the user's signed-in browsers)

### 6. Distribution

- **Visibility**: Public
- **Regions**: All regions
- **Mature content**: No

### 7. Submit for Review

1. Review all entered information
2. Accept the Developer Agreement
3. Click "Submit for Review"

**Expected Review Time**: 1-3 business days

---

## Post-Publish Checklist

- [ ] Verify extension installs correctly from the store
- [ ] Test all features work in the published version
- [ ] Monitor the Reviews section for user feedback
- [ ] Set up analytics (optional) for install tracking

---

## Version History

### v1.0.0 (Initial Release)
- Wider chat layout (98% width)
- Copy as Markdown (per-response)
- Export full chat as Markdown
- 40+ keyboard shortcuts
- Default model selection
- Omnibox quick launch (type "gem")
- Popup quick toggles
- Full options page
