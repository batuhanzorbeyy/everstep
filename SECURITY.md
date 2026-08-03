# Security Policy

## Supported versions

Security fixes are applied to the latest release of Everstep.

| Version | Supported |
| --- | --- |
| 1.3.x | Yes |
| Earlier releases | No |

## Report a vulnerability

Please use GitHub's private vulnerability reporting from the repository's **Security** tab. Do not open a public issue for a suspected vulnerability and do not include private user data in a report.

Include the affected version, a clear reproduction path, expected impact, and any relevant logs with personal information removed. You should receive an initial response within seven days.

## Security model

- Everstep works offline and contains no analytics, advertising, account system, cloud synchronization, or remote-code loading.
- Renderer processes use Chromium sandboxing and context isolation with Node.js integration disabled.
- Production network requests, embedded webviews, new windows, unexpected navigation, and renderer permission requests are blocked.
- The preload bridge exposes a small set of bounded operations. IPC messages are accepted only from the trusted application renderer.
- JSON imports are size-limited and sanitized before use. Imported collections have explicit upper bounds.
- CSV exports neutralize spreadsheet formula prefixes.
- PDF reports are rendered in an isolated process with JavaScript and network access disabled.

Run `npm run security:check` to verify the main Electron and Content Security Policy protections. `npm run security:audit` checks dependencies for high-severity advisories.
