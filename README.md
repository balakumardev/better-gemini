# Better Gemini

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A Chrome extension that adds a wider chat, keyboard shortcuts, Markdown export, a default model setting, and address-bar launch to Google Gemini.

## Features

- **Wide chat and tables**: The conversation, your messages, the prompt box, and tables use up to 98% of the available width
- **Omnibox quick launch**: Type `gem` followed by your prompt to launch directly into Gemini, with the prompt auto-submitted. Open it in the current tab, a new tab, or a background tab. Supports special characters, emoji, and international text
- **Export full chat**: An Export button above the prompt box copies the whole conversation as Markdown or downloads it as a `.md` file
- **20+ keyboard shortcuts**: New chat, sidebar toggle, chat switching, copy last response or code block, and more. Press `Cmd/Ctrl+Shift+?` on Gemini to see the full list
- **Default model and thinking level**: Pick the model and thinking level that new chats start with, from the options page. A choice your account does not offer is skipped

The wide chat, export, keyboard shortcuts, and default model features each have an on/off switch in the popup and the options page.

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `better-gemini` directory

## Usage

### Quick Start

1. Click the Chrome address bar
2. Type `gem` and press `Tab` or `Space`
3. Type your prompt (e.g., `What is quantum computing?`)
4. Press `Enter`

Gemini will open with your prompt auto-submitted.

### Tab Options

- **Enter** — Open in current tab
- **Alt+Enter** (Win/Linux) or **Option+Enter** (Mac) — New foreground tab
- **Ctrl/Cmd+Enter** — New background tab

### Examples

```
gem What is the capital of France?
gem Explain recursion in programming
gem 日本語で説明してください
gem Tell me about 🚀 rockets
```

## Testing

```bash
cd tests
npm install
npm test              # Run unit + integration tests
npm run test:e2e      # Run E2E browser tests
npm run test:coverage # Generate coverage report
```

See [tests/README.md](tests/README.md) for detailed testing instructions.

## Project Structure

```
better-gemini/
├── manifest.json       # Extension manifest (Manifest V3)
├── background.js       # Service worker (omnibox handler)
├── config.js           # Centralized configuration
├── content/
│   ├── injector.js     # Content script for Gemini pages
│   └── injector-core.js
├── icons/              # Extension icons
├── modules/            # Future extensibility
└── tests/              # Test suite
```

## Configuration

All settings are centralized in `config.js`:
- DOM selectors for Gemini UI
- Timing constants
- URL patterns

## Permissions

- `activeTab`: Declared so the omnibox quick launch can open Gemini in the current tab
- `storage`: Saves your settings (feature switches, preferred model, thinking level) with `chrome.storage.sync`
- Host access to `https://gemini.google.com/*`: The content scripts run only on Gemini pages

## License

[MIT](LICENSE)

