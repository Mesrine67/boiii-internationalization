# Contributing translations

Launcher translations live in `data/launcher/locales/`. English (`en-US`) is the source catalog; add one JSON catalog per locale and register it in `manifest.json`.

## Locale and catalog rules

- Use a BCP-47 language and region identifier, such as `fr-FR`, `de-DE`, or `es-ES`.
- Save catalogs as UTF-8 JSON. Keep `_meta.schemaVersion`, `_meta.locale`, `_meta.sourceLocale`, and `_meta.translationVersion` consistent with the manifest entry.
- Preserve the English catalog's keys. Add a new key to `en-US.json` first, then translate it in every maintained locale.
- Keep keys stable and descriptive, for example `launcher.settings.language` or `launcher.verify.complete`. The `launcher.legacy` namespace exists temporarily to preserve older exact-text translations; new strings must not be added there.
- Keep BO3 native localized-string references exactly as they appear in the game/client. Do not rename native references to launcher-style keys or place them in launcher catalogs.
- Keep product names, player names, paths, Workshop titles, and other user-provided content unchanged unless the source explicitly marks them as translatable.

## Parameters and plurals

Use named placeholders such as `{current}`, `{total}`, or `{name}`. Do not change placeholder names between English and translated catalogs. For count-dependent messages, use an object with `one` and `other` forms. The current runtime selects `one` when `count` is exactly 1 and otherwise uses `other`; it is not a full ICU MessageFormat implementation.

## Validation

Run these checks before opening a pull request:

```powershell
node scripts/i18n/validate-catalogs.mjs
node scripts/i18n/test-runtime.mjs
```

The validator reports catalog coverage and exact legacy source strings it could not find in the scanned launcher/client sources. Review those reports; source-text matches are only a migration aid and do not prove that every runtime screen is translated. Include screenshots for changed launcher screens when practical. Game UI, subtitles, audio, FastFiles, and launcher text are separate translation surfaces.
