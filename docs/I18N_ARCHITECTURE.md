# BOIII / Ezz Internationalization Architecture

Audit snapshot: 2026-10-04  
Upstream source checked: `Ezz-lol/boiii-free`, stable tag `v3.0.0` and `beta` at `8521675ce893ca3ca1a1798ff4fed23b9eed387c`.

## 1. Scope and branch policy

| Version / branch | Purpose | Active i18n maintenance? | Reason |
|---|---|---:|---|
| `main` / v3.x stable | Public stable client and launcher | Yes | `v3.0.0` is the current stable baseline. Land and verify stable-facing changes here first. |
| `beta` | Current experimental client and launcher | Yes, after stable changes are checked against beta | The branch is 66 commits ahead of `main` in this snapshot and changes launcher HTML/JS/CSS, Workshop, scripts, errors, and client code. It needs its own compatibility check. |
| v1.x and v2.x tags | Historical releases | No | Keep tags and release sources available. Do not carry a second maintained translation implementation unless a specific upstream change requires a targeted backport. |

The fork should keep `main` and `beta` aligned with their matching Ezz upstream branches. Put locale catalogs, validation tools, and documentation in the same paths on both branches. Keep branch-specific launcher or C++ adaptations separate. Cherry-pick or merge the shared i18n commits after checking conflicts and behavior on each branch; do not copy the catalogs into parallel language-specific branches. Do not merge upstream work into Ezz or alter its branches.

The available release tags include `v1.3.2`, `v2.0.0` through `v2.3.1`, and `v3.0.0`. A scoped comparison of `v2.3.1..v3.0.0` changes 20 launcher, game-UI, and localized-string files (1,076 insertions and 305 deletions in that scope). In particular, `src/client/launcher/launcher.cpp` has 553 changed lines, launcher Workshop callbacks changed, and v3 adds several UI-script features. That is enough structural drift to make permanent backports costly, while no separate v2 localization pipeline was identified that would justify maintaining it. Keep v1/v2 tags as historical reference and backport only a concrete fix when requested. The `beta` snapshot is 66 commits ahead of `main` and has further launcher, Workshop, script, and client changes, so it needs a branch-specific port and build check rather than assuming the stable patch applies unchanged.

## 2. Current Ezz architecture

The launcher is a native Windows window hosting HTML, CSS, and JavaScript. `src/client/launcher/launcher.cpp` registers the native callbacks and loads `%LOCALAPPDATA%/boiii/data/launcher/main.html`. `src/client/launcher/html/html_frame.cpp` embeds WebView2 on Windows and falls back to the legacy browser path under Wine. The HTML assets and client are separate from the game UI.

JavaScript calls native C++ through the host object (`window.chrome.webview.hostObjects.sync.external` on WebView2, or `window.external` on the legacy path). C++ registers named callbacks for launch, settings, file verification, diagnostics, library and Workshop operations. Preferences are stored through `utils::properties`; launch options are also mirrored in browser storage. This synchronous bridge is an existing interface and should be kept during the localization migration.

Startup runs the Ezz updater/bootstrap before the launcher. The launcher HTML is loaded from the shared BOIII AppData tree, so locale files must ship and update beside `main.html`, `main.js`, and `main.css`. `data/launcher/verification.json` is a game-file verification list, not the launcher translation catalog. The inspected repository has no NSIS or WiX installer project; its current installation/update contract is the client updater and AppData payload.

The updater source currently hard-codes Ezz's `r2.ezz.lol/boiii.json` and `boiii-beta.json` manifests and matching download folders. A GitHub fork alone does not redirect updates to the fork, publish a release channel, or guarantee that new locale JSON files reach AppData. Phase 1 therefore treats catalogs as local client payloads; before distributing a fork build, its release manifest must include `data/launcher/locales/*` and the updater feed must be deliberately configured for that release channel.

Under Wine, the legacy HTML engine may not support the same browser APIs as WebView2. The localization runtime should use ES5-compatible JavaScript, avoid `fetch()` from `file://`, and load its JSON through a narrow native callback. This also gives C++ a common place to validate locale IDs and file sizes.

## 3. Current localization inventory and gaps

This is a source scan of the current `i18n/main` working tree, not a count of every possible server, mod, or game string:

| Surface | Observed inventory | State |
|---|---:|---|
| Launcher HTML | 3,390 lines; current scanner checks 345 visible text/attribute fragments | The validator maps every static fragment or recognized dynamic template to a catalog entry. Brand names, versions, shortcuts, maintainer names, paths, and user content remain data rather than translated copy. |
| Launcher catalogs/runtime | 666 source keys: 474 legacy mappings and 192 named/dynamic entries | French has 666/666 entries. Runtime matching supports placeholders, plurals, verification summaries, and multiline Workshop details; the legacy exact-text map remains a compatibility bridge. |
| Launcher C++ status APIs | 68 calls to verify/remove/Workshop status setters, with 55 distinct first-literal messages in this scan | Status callbacks include `messageKey`; the HTML resolves messages and details through the active catalog. The retry-limit Windows dialog also reads that catalog. Other native dialogs and updater errors still need inventory. |
| In-game overrides | 266 top-level entries were loaded by the test client in the prior run | This only demonstrates that the override file was read. It does not prove every key resolves or that the UI is fully French. |

The screenshot of the Ezz launcher showed untranslated labels such as `Play` and `Workshop`; the screenshot of the BO3 Controls page showed a separate in-game gap: its frame-smoothing description remained English. The launcher selector now offers System default, English, and French through the locale catalog loader. This does not translate the separate in-game menus or install French game assets.

Launcher strings come from several places:

* HTML text, labels, button names, placeholders, titles, and accessibility attributes.
* JavaScript-generated status text, validation errors, toasts, modal titles, and Workshop messages.
* C++ strings sent as status/message/detail fields, native file-picker text, and updater/error dialogs.
* Dynamic third-party data such as mod names, Workshop titles, player names, paths, and server descriptions. These are user/content data and should not be translated by rewriting arbitrary text.

Catalog coverage is reported by `scripts/i18n/validate-catalogs.mjs`. The source scan excludes known user data and recognizes catalog templates such as counts and dynamic paths, so the remaining warnings indicate actual gaps rather than values that should be translated.

### Phase 1 implementation snapshot

The launcher catalogs contain 666 English leaf keys and matching French entries (100% catalog key coverage). The 474 imported source strings now use readable dotted keys under `launcher.legacy.*`, with explicit names for duplicate variants instead of generated hash suffixes. The validator finds every scanned static HTML fragment and no unused legacy source strings. This measures the catalog and scanned source only; it does not prove every third-party or runtime-generated value is translatable. New home-screen, language-selector, launch-options, status, and Workshop text uses named keys or catalog templates; the exact-text bridge remains temporary.

## 4. Recommended repository layout

Keep launcher UI translations separate from client messages and game translations:

```text
data/
  launcher/
    main.html
    main.js
    main.css
    localization.js
    locales/
      manifest.json
      en-US.json
      fr-FR.json
      de-DE.json           # add only when translated
  localization/
    client/
      en-US.json            # Ezz client messages, introduced in Phase 2
      fr-FR.json
    game-overrides/
      en-US.json            # only mappings to native BO3 references
      fr-FR.json
```

Use BCP-47 locale names for launcher and client catalogs (`en-US`, `fr-FR`). Keep original BO3 reference identifiers exactly as authored (usually uppercase/underscore keys); do not rename them to app-style dotted IDs. If the engine or its asset pipeline requires a short region code, define a separate, evidence-backed mapping for that boundary. The game’s historical shorthand values must not be inferred from BCP-47 tags.

Use hierarchical names for launcher-owned messages, for example:

```json
{
  "_meta": {
    "schemaVersion": 1,
    "locale": "fr-FR",
    "sourceLocale": "en-US",
    "translationVersion": 1
  },
  "launcher": {
    "common": { "play": "Jouer" },
    "settings": { "language": "Langue", "languageSystem": "Langue du système" },
    "verify": { "scanning": "Vérification des fichiers…" }
  }
}
```

Use ICU MessageFormat only if a compatible implementation is deliberately bundled. Until then, define a small, documented placeholder syntax (`{current}`, `{total}`, `{name}`) and plural objects (`one` / `other`) in the catalog validator/runtime. Placeholder sets must match the English source. Never form a translated sentence by concatenating words around a number when word order can vary.

The imported source phrases now map to readable, stable IDs such as `launcher.legacy.workshop.ready.text`; the `legacy` namespace marks their upstream origin, not a generated ID. New code must use explicit IDs (`data-i18n="launcher.settings.language"` or `t("launcher.verify.scanning", params)`). The exact-source reverse lookup remains only as a compatibility bridge for older upstream callbacks and should be removed when those callers all emit message keys. Missing French keys fall back to English and are reported by validation/debug logging.

## 5. Locale selection, persistence, and fallback

Resolve the launcher locale in this order:

1. A saved explicit user choice (`en-US` or `fr-FR`).
2. Windows user locale, normalized only to a language that is actually available (for example, `fr-CA` can fall back to an available `fr-FR` catalog).
3. The nearest supported language, if a future locale resolver can establish one safely.
4. `en-US`.

Provide a `System default` entry in the launcher language selector. Persist the preference using Ezz's native settings store, not only `localStorage`, so a reset of WebView data does not silently reset the user's language. Set `<html lang>` to the resolved locale. Locale changes should apply in the current launcher window by re-running localization on explicit IDs and preserving each element's source value.

Catalog lookup must be allow-listed. Unknown, missing, malformed, or incompatible catalogs fall back to `en-US`; they must never produce an empty screen or allow arbitrary filesystem paths. In debug mode, log the locale and missing keys. A corrupt or missing French catalog should not prevent launching the game.

For BO3 language behavior, do not pass an arbitrary locale string as a command-line switch. Keep an explicit mapping from a supported UI locale to a verified game-language option. At this stage only the existing French `-french` behavior is used; do not assume that translating the launcher also installs game text, audio, or subtitles.

## 6. C++ ↔ launcher message contract

Verification, removal, and Workshop callbacks now preserve the English `message` for state checks and also send a catalog-derived `messageKey`. The HTML resolves exact messages and parameterized status/detail text against the selected locale. Dynamic verification summaries use a dedicated formatter because the client assembles their counts and component issues before sending them. Remaining updater and native-dialog strings still need migration. The target contract for new callbacks remains a key plus typed parameters:

```json
{
  "key": "launcher.workshop.copyingFiles",
  "params": { "current": 12, "total": 20 },
  "progress": 60.0,
  "detail": "mods/example"
}
```

The HTML runtime translates `key` and formats `params`; `detail` remains data (or receives its own key if it is actually a user-facing sentence). Keep transport fields and status enums language-neutral. Do not translate error codes, filenames, Workshop content, or log text in-place.

Native dialogs that cannot appear inside the WebView can use a small C++ catalog reader against the same locale JSON. Keep locale resolution and message IDs shared; do not maintain a second independent French phrase table. Windows/system error text may remain OS-provided unless BOIII owns a stable error code and message.

## 7. BO3 / T7 localization evidence and boundaries

### Confirmed in the inspected Ezz tree

* Ezz already has `localized_strings::override(reference, value)`, which hooks the engine string resolver and overrides by reference. Ezz components use this to alter selected strings. This is the natural integration seam for a small number of game overrides.
* The BO3 script VM exposes a `LOCALIZED_STRING` value type. Ezz Lua/UI code calls `Engine.Localize("REFERENCE")` for native references.
* The string resolver uses two build-specific addresses in `game::select`; this must be revalidated when syncing to beta or another game binary.
* The app's dvar-name lookup lists `language`, `loc_language`, and `loc_languageSaved`; the list alone does not document their runtime semantics.
* Dedicated-server initialization explicitly disables the default `language_settings.cfg` execution. This is server behavior and is not evidence that the client reads the same config as its localization source.
* The tested game folder contains an English `localization.txt` and an `english` zone directory, but no French zone directory. The test files therefore do not establish that French game assets or voices are installed.

### Original asset structure (community reverse-engineering reference)

The public COD Engine Research reference describes the Call of Duty localize asset as a `(name/reference, value)` pair. Its source format uses category `.str` files under `raw/english/localizedstrings/`, `REFERENCE` identifiers and language fields such as `LANG_ENGLISH`; it notes `#same` as an English fallback marker. BO3 Mod Tools and the installed game assets should be used to confirm the exact BO3 language tokens and compilation steps before generating or distributing any asset.

The BO3 modding audio documentation uses separate `soundloc_assets/<code>` folders and short codes such as `en`, `fr`, `it`, `es`, `ge`, and `bp`. This is community documentation, not an official Treyarch format specification; those audio folder codes are not proof of the language tokens used by every UI/FastFile path. It does confirm that localized audio is a different asset pipeline from text overrides; the launcher cannot provide audio by adding strings to JSON.

### Safe game-translation design

1. Preserve native reference keys exactly and use `localized_strings::override` only for confirmed IDs.
2. Keep game overrides separate from launcher labels and Ezz-owned client messages.
3. Do not use resolved English text as a general override key in the long-term design. Different references can share the same visible text; text-based matching can translate the wrong entry and is not a stable identifier.
4. Do not replace `localization.txt`, zones, or FastFiles blindly. Their purpose, load order, language tokens, and compatibility with custom maps/mods need a separate test against real installed assets.
5. Do not include game-owned FastFiles, audio, or other game files in the translation repository. Store only authored translations, native keys, scripts/patches, and reproducible tooling.

The public sources inspected do not include Treyarch's original engine source or an authoritative BO3 localization specification. The exact client dvar-to-zone mapping, French subtitle/audio availability, menu asset fallback behavior, and game-language config precedence remain unconfirmed. A JSON string override can localize only calls that reach the hooked resolver; it cannot translate baked textures, raw UI text, voice files, or every string embedded in assets.

## 8. Translation pack compatibility manifest

Prefer a small format/API version and supported channel range over tying a translation to every upstream commit:

```json
{
  "schemaVersion": 1,
  "sourceLocale": "en-US",
  "locales": {
    "en-US": {
      "translationVersion": 1,
      "status": "source",
      "channels": ["stable", "beta"]
    },
    "fr-FR": {
      "translationVersion": 1,
      "status": "partial",
      "stable": ">=3.0.0 <4.0.0",
      "beta": true
    }
  }
}
```

Treat `schemaVersion` as a runtime-format contract. `translationVersion` changes when translators need to review substantial wording or key movement, not on every source commit. `status: partial` must remain until runtime coverage is measured and reviewed; a full catalog key match is not proof of a fully translated game.

## 9. Community workflow, QA, and CI

Add `CONTRIBUTING_TRANSLATIONS.md` with locale naming, source-locale policy, placeholder and plural rules, product names that should not be translated, UTF-8 requirements, native BO3 reference rules, and screenshot/review guidance. A contributor should add one locale catalog and manifest entry, then run the validator locally.

The validator/CI report should show, per surface and locale:

* source key count, translated count, missing count, and percentage;
* unused catalog keys and duplicate IDs;
* invalid locale metadata, invalid JSON, empty values, malformed UTF-8, and placeholder mismatch;
* game override keys not found in the checked reference inventory, clearly marked as unverified if game assets are unavailable.

Do not use machine translation at build time. Translation output must be reviewed and committed as ordinary UTF-8 catalogs. CI should compare all locales to `en-US`, fail on malformed source/metadata/placeholders, and publish a coverage summary without requiring game binaries or copyrighted assets.

## 10. Installer and update recommendations

No NSIS/WiX installer files were found in this source snapshot. Tauri's installer documentation is useful as a pattern only: its NSIS bundle can carry one multi-language setup with an OS-language default and an optional language selector; its WiX configuration builds per-language MSI packages and uses language-specific `.wxl` resources. If Ezz later adds a dedicated setup program, NSIS is the closer community-friendly model for one multilingual installer. Do not add Tauri or replace Ezz's updater just for this.

For the existing updater, keep catalogs beside the launcher payload, verify them as text resources, and update them atomically with the UI code. The current updater is still pointed at Ezz's manifests; a forked distribution needs its own manifest/feed configuration or an explicitly published upstream build before these locale files can be delivered to other machines. Preserve user preferences and downloaded content during repair/update. Uninstall behavior should remove only files owned by the launcher and honor current Ezz data-retention behavior; do not invent a new destructive cleanup step as part of localization.

## 11. Phased migration

### Phase 1 — launcher catalog and French

* Keep `en-US` as the source and extract existing French mappings without deleting them.
* Add locale metadata, catalog loading, locale resolution, fallback, interpolation, missing-key diagnostics, and a persistent system/English/French selector.
* Migrate launcher static labels first using explicit hierarchical keys; keep a compatibility bridge for the remaining exact-text entries.
* Add a catalog validator and contribution instructions. Do not translate game assets in this phase.

### Phase 2 — C++ launcher messages

* [x] Add catalog-backed keys to verification, removal, and Workshop status callbacks.
* [x] Translate dynamic verification summaries, counts, and Workshop detail templates.
* [x] Use the same locale catalogs for the Workshop retry-limit Windows dialog.
* [ ] Inventory remaining updater, file-picker, notification, and native error strings; move state decisions to explicit status/error codes.

### Phase 3 — in-game strings

* Build a verified list of native BO3 references, identify which strings resolve through Ezz's hook, and migrate the current French prototype to a separate game-overrides catalog.
* Confirm the game language flag/dvar and installed assets with the actual game resource pipeline. Add localized text/assets only when generated from a legally available toolchain and tested against base game, custom maps, and mods.

### Phase 4 — community/CI

* Add translation coverage reports, missing/unused-key checks, placeholder rules, and review guidance to CI.
* Add a new locale only when a reviewed catalog exists; keep stable and beta compatibility explicit.

### Phase 5 — installer, if Ezz adopts one

* Evaluate a single multilingual NSIS installer and localized repair/uninstall strings. Until then, keep the current updater/AppData distribution path.

## 12. Verification matrix and risks

Catalog/runtime checks must cover English complete, French complete for the declared catalog, missing French key fallback, unknown locale fallback, interpolation, plural selection, UTF-8 accents/apostrophes, live language change, saved preference, and restart. Launcher runtime checks must exercise initial update/bootstrap, launch, verification, error display, settings, Workshop, and launch arguments on stable and beta.

Game checks must be separate: existing `-french` flag, native reference lookup, FR override file load, menu visibility, missing key fallback, game exit/relaunch, custom maps/mods, and dedicated server. A file being read or a client process starting is not proof that the expected language is visible. Native UI inspection is required before claiming visual success.

Main risks are branch drift (beta has a materially different launcher/client), JSON not being included in the launcher payload, code-page corruption at the C++/WebView boundary, unsupported WebView APIs under Wine, mismatched native game references, custom-map expectations for language assets, and overclaiming game coverage based only on a loaded override count.

## 13. References used

* Ezz source and release history: <https://github.com/Ezz-lol/boiii-free> and <https://github.com/Ezz-lol/boiii-free/releases/tag/v3.0.0>
* Next.js dictionary/locale organization: <https://nextjs.org/docs/app/guides/internationalization>
* Tauri Windows installer localization: <https://v2.tauri.app/distribute/windows-installer/>
* `tauri-plugin-i18n` catalog and dynamic-locale patterns: <https://github.com/razein97/tauri-plugin-i18n>
* COD Engine Research, community documentation of localize assets and `.str` source: <https://codresearch.dev/index.php/Localize_Asset>
* BO3 modding documentation for localized audio assets: <https://wiki.codmods.com/docs/bo3/sound/localized_sounds>
