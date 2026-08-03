# Changelog

## 1.3.1 — 2026-08-03

- Neutralized spreadsheet formula prefixes in CSV exports.
- Added upper bounds for imported tasks, sessions, and achievement records.
- Applied the desktop JSON file-size limit to the browser import fallback.
- Added regression tests for CSV export hardening and import collection limits.
- Made repeated MSIX builds replace the previous generated output reliably.

## 1.3.0 — 2026-07-29

- Added complete Japanese, German, Italian, and Azerbaijani interface translations, expanding Everstep from three to seven languages.
- Localized all 257 interface strings for timer controls, tasks, statistics, badges, focus sounds, settings, notifications, onboarding, CSV/PDF reports, dates, and durations.
- Added automatic Windows language detection for `ja`, `de`, `it`, and `az` locales.
- Added localized system-tray actions and locale-aware duration/date formatting for all new languages.
- Added Japanese, German, Italian, and Azerbaijani Microsoft Store listing, support, and privacy templates.
- Updated MSIX language resources and bumped the application version to **1.3.0** and manifest version to **1.3.0.0**.
- Preserved the approved Everstep logo, automatic theme contrast, offline operation, and hardened Electron security configuration.

## 1.2.2 — 2026-07-29

- Added automatic light/dark surface detection for custom theme palettes.
- Text, secondary text, borders, controls and shadows now adapt when the theme base is white or another light color.
- Added automatic readable text selection for custom accent colors.
- Preserved the v1.2.1 Everstep logo and all v1.2.0 security protections.
- Updated the application version to **1.2.2** and the MSIX manifest version to **1.2.2.0**.

## 1.2.1 — 2026-07-29

- Replaced the Everstep brand icon with the user-provided red Pomodoro clock and ascending-step logo.
- Updated the application icon, system tray icon, MSIX tile assets, splash screen, Store hero, and Store screenshots.
- Added `assets/logo-source.png` and updated the asset generator so future builds reproduce the approved logo consistently.
- Preserved the hardened offline Electron security configuration introduced in v1.2.0.
- Updated the application version to **1.2.1** and the MSIX manifest version to **1.2.1.0**.

## 1.2.0 — 2026-07-29

- Reduced the desktop left gutter between the resizable sidebar and the date/title area.
- Aligned the Today header closer to the sidebar boundary while keeping a small breathing space.

## 1.1.6 — 2026-07-29

- Refined the Pomodoro timer typography so large values like `30:00` and `25:00` have cleaner spacing and improved readability.
- Fixed the sidebar brand area so the Everstep subtitle no longer overflows when the left panel is narrowed.
- Added responsive brand behavior for very small sidebar widths: the subtitle clamps first, then hides when the panel becomes extremely narrow.

## 1.1.5 — 2026-07-29

- Added a Spotify-style draggable sidebar divider. The desktop sidebar can now be resized continuously from **180 px to 380 px**.
- Sidebar width is saved locally and restored when Everstep opens again.
- Clicking the Everstep logo toggles a compact vertical icon rail, giving the Today screen more working space.
- Added a separate **Theme Palette** editor with **Base, Left Glow, Mid Tone, and Right Glow** controls.
- Theme presets now coordinate the application palette, accent color, and Today background palette for a more coherent visual result.
- Preserved independent customization: the general theme palette and Today background palette can still be edited separately.
- Fixed appearance-only settings so changing colors or sidebar size no longer resets a paused timer.
- Updated the package and MSIX manifest version to **1.1.5.0**.

## 1.1.4 — 2026-07-29

- Reimagined the **Today / Bugün** screen with a modern blurred gradient hero inspired by the provided reference visuals.
- Kept the four core statistics visible on the Today screen: **Today's goal**, **Focus time**, **Focus score**, and **Current streak**.
- Added a **background palette editor** in Settings so the Today screen colors can be changed with presets and individual color pickers.
- Preserved the existing Pomodoro timer, quick task access, and weekly focus rhythm inside the refreshed layout.
- Updated the package and MSIX manifest version to **1.1.4.0**.

## 1.1.2 — 2026-07-28

- Replaced the synthetic rain texture with a richer, natural-sounding continuous rain soundscape.
- Added cafe ambience, thunderstorm, wind and rustling leaves, ocean waves, forest and birds, and fireplace/campfire soundscapes.
- Kept white, pink, and brown noise options.
- Added bundled offline MP3 assets with seamless looping and instant volume control.
- Added autoplay recovery after the first keyboard or pointer interaction.
- Expanded Turkish, English, and Spanish sound labels and descriptions.
- Updated the MSIX manifest and application version to 1.1.2.0.

## 1.1.1 — 2026-07-27

- Added Turkish, English, and Spanish interface support.
- Added automatic Windows language detection with English fallback.
- Added an instant language selector in Settings.
- Localized notifications, timer labels, statistics, badges, ambient sound labels, confirmations, onboarding, CSV exports, PDF reports, dates, durations, and tray menu actions.
- Added Spanish Microsoft Store listing, privacy policy, and support template.
- Updated MSIX manifest resources and package version to 1.1.1.0.
- Kept backward compatibility with v1.0.0 local data and backups.
