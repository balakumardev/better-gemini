# Test Suite

Unit, integration, and E2E tests for the Better Gemini extension.

## Prerequisites

- Node.js >= 18.0.0
- Chrome/Chromium (for E2E tests)

## Setup

```bash
npm install
npx playwright install chromium  # For E2E tests
```

## Running Tests

```bash
npm test                   # Unit + integration tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E browser tests
npm run test:coverage      # With coverage report
npm run test:watch         # Watch mode
```

## Structure

```
tests/
├── unit/           # Unit tests (Jest)
├── integration/    # Integration tests (Jest)
├── e2e/            # Browser tests (Playwright)
├── utils/          # Test utilities
└── setup/          # Configuration
```

## Notes

- E2E tests require headed mode (Chrome extensions limitation)
- Some E2E tests require being logged into Gemini

