# Better Gemini

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A Chrome extension that enables direct launching of Google Gemini queries from the browser address bar.

## Features

- **Omnibox Integration**: Type `gem` followed by your prompt to launch directly into Gemini
- **Smart Prompt Injection**: Auto-submits your prompt in Gemini's input field
- **Tab Control**: Open in current tab, new tab, or background tab
- **Unicode Support**: Full support for special characters, emoji, and international text

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

- `activeTab`: Access current tab for script injection
- `scripting`: Programmatic script injection
- `storage`: User preferences

## License

[MIT](LICENSE)

