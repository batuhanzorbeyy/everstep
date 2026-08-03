# Contributing to Everstep

Thanks for taking the time to improve Everstep. Small, focused changes are easier to review and maintain.

## Before opening an issue

- Search existing issues to avoid duplicates.
- Use the bug template for reproducible problems.
- Keep security reports private by following [SECURITY.md](SECURITY.md).

## Local setup

Everstep requires Windows 10/11, Node.js 22 or newer, and npm.

```powershell
npm ci
npm run dev
```

## Pull requests

1. Create a branch from `main`.
2. Keep the change limited to one clear problem or feature.
3. Follow the existing TypeScript, React, and CSS patterns.
4. Add or update tests when behavior changes.
5. Run the checks below before opening the pull request.

```powershell
npm test
npm run build
```

Explain what changed, why it was needed, and how you verified it. Screenshots are useful for visible interface changes.

## Translations

Interface strings are maintained in `src/i18n.ts`. Keep placeholders intact and check the result at normal and narrow window sizes. Store listing, support, and privacy documents are maintained separately for each supported language.

By contributing, you agree that your contribution may be distributed under the [MIT License](LICENSE).
