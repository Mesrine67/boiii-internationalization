import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = fs.readFileSync(path.join(root, "data/launcher/localization.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data/launcher/locales/manifest.json"), "utf8"));
const catalogs = {};
for (const locale of Object.keys(manifest.locales)) {
  catalogs[locale] = JSON.parse(fs.readFileSync(
    path.join(root, "data/launcher/locales", manifest.locales[locale].file), "utf8"));
}

catalogs["en-US"].launcher.testing = {
  greeting: "Hello, {name}",
  files: { one: "{count} file", other: "{count} files" },
  fallback: "English fallback",
};
catalogs["fr-FR"].launcher.testing = {
  greeting: "Bonjour, {name}",
  files: { one: "{count} fichier", other: "{count} fichiers" },
};

let systemLocale = "fr-FR";
const bridge = {
  loadLauncherLocaleManifest: () => JSON.stringify(manifest),
  loadLauncherLocale: (locale) => catalogs[locale] ? JSON.stringify(catalogs[locale]) : "",
  getSystemLocale: () => systemLocale,
};
const body = {
  nodeType: 1,
  tagName: "BODY",
  className: "",
  childNodes: [],
  hasAttribute: () => false,
  getAttribute: () => null,
};
const window = {
  getExternal: () => bridge,
  console,
  localStorage: { getItem: () => null },
};
const document = {
  body,
  documentElement: {},
  createTreeWalker: (rootNode, whatToShow) => {
    const nodes = [];
    function visit(node) {
      for (const child of node.childNodes || []) {
        if ((whatToShow === 1 && child.nodeType === 1) ||
            (whatToShow === 4 && child.nodeType === 3)) nodes.push(child);
        if (child.nodeType === 1) visit(child);
      }
    }
    visit(rootNode);
    let index = 0;
    return { nextNode: () => nodes[index++] || null };
  },
};
const context = { window, document, localStorage: window.localStorage };
vm.runInNewContext(script, context, { filename: "localization.js" });
const i18n = window.BOIIILauncherI18n;

assert.equal(i18n.setLanguage("fr-CA"), "fr-FR", "regional fallback should choose available French");
assert.equal(i18n.translateKey("launcher.testing.greeting", { name: "Mike" }), "Bonjour, Mike");
assert.equal(i18n.translateKey("launcher.testing.files", { count: 1 }), "1 fichier");
assert.equal(i18n.translateKey("launcher.testing.files", { count: 4 }), "4 fichiers");
assert.equal(i18n.translateKey("launcher.testing.fallback"), "English fallback", "missing French key should use English");
assert.equal(i18n.translate("This workshop item is already installed at:\nZ:\\mods\\map\n\nRemove it first if you want to reinstall."),
  "Cet élément de l’Atelier est déjà installé ici :\nZ:\\mods\\map\n\nSupprimez-le d’abord si vous souhaitez le réinstaller.");
assert.equal(i18n.translateKey("launcher.language.help").includes("Windows"), true, "French accents/apostrophes should survive UTF-8 decoding");
assert.equal(i18n.translate("Page 2 / 7"), "Page 2 sur 7", "dynamic page counters should come from the locale catalog");
assert.equal(i18n.translate("3 items"), "3 éléments", "pluralized launcher counts should use catalog forms");
assert.equal(i18n.translate("Workshop ID: 311210"), "ID de l’Atelier : 311210");
assert.equal(i18n.translate("Starting download for Kino..."), "Téléchargement de Kino…");
assert.equal(i18n.translate("Starting download: Kino (attempt 2)"),
  "Démarrage du téléchargement : Kino (tentative 2)");
assert.equal(i18n.translate("Downloading Kino..."), "Téléchargement de Kino…");
assert.equal(i18n.translate("Waiting for SteamCMD... (attempt 2)"),
  "En attente de SteamCMD… (tentative 2)");
assert.equal(i18n.translate("Updating SteamCMD... (attempt 2)"),
  "Mise à jour de SteamCMD… (tentative 2)");
assert.equal(i18n.translate("Verifying (Campaign Multiplayer)..."),
  "Vérification (Campagne Multijoueur)…");
assert.equal(i18n.translate("Mode: Campaign Multiplayer"), "Mode : Campagne Multijoueur");
assert.equal(i18n.translate("Loading manifest..."), "Chargement du manifeste…");
assert.equal(i18n.translate("Removing mod..."), "Suppression du mod…");
assert.equal(i18n.translate("1 file with issues:"), "1 fichier avec des problèmes :");
assert.equal(i18n.translate("4 files with issues:"), "4 fichiers avec des problèmes :");
assert.equal(i18n.translate("verification.json not found in Z:\\BO3\\verification.json"),
  "verification.json est introuvable dans Z:\\BO3\\verification.json");
assert.equal(i18n.translate("All: Verified 3 files: 3 OK - all good!"),
  "Tous : 3 fichiers vérifiés : 3 OK — tout est correct !");
assert.equal(i18n.translate("Campaign: Verified 10 files: 8 OK | ERRORS: 1 missing 1 wrong size | Optional (DLC): 1 corrupt | Base Game: 1 missing ; MP DLC: 1 corrupt"),
  "Campagne : 10 fichiers vérifiés : 8 OK | ERREURS : 1 fichier manquant, 1 fichier de taille incorrecte | Contenu facultatif (DLC) : 1 fichier corrompu | Jeu de base : 1 fichier manquant ; DLC multijoueur : 1 fichier corrompu");
assert.equal(i18n.translate("This workshop item is already installed at:\nZ:\\mods\\map\n\nRemove it first if you want to reinstall."),
  "Cet élément de l’Atelier est déjà installé ici :\nZ:\\mods\\map\n\nSupprimez-le d’abord si vous souhaitez le réinstaller.");
assert.equal(i18n.translate("SteamCMD did not download to the expected path.\nChecked: Z:\\steamcmd\\content\n    and: Z:\\content"),
  "SteamCMD n’a pas téléchargé les fichiers dans le dossier attendu.\nVérifié : Z:\\steamcmd\\content\n    et : Z:\\content");
assert.equal(i18n.translate("Only 500 MB remaining. Free up disk space and try again."),
  "Il ne reste que 500 MB. Libérez de l’espace disque et réessayez.");
assert.equal(i18n.translate("All files verified — no changes detected."),
  "Tous les fichiers sont vérifiés : aucune modification détectée.");
assert.equal(i18n.normalizeLocale("xx-ZZ"), "en-US", "unknown locale should use source locale");
assert.equal(i18n.setLanguage("xx-ZZ"), "en-US");
assert.equal(i18n.translateKey("launcher.testing.greeting", { name: "Mike" }), "Hello, Mike");
systemLocale = "fr-FR";
assert.equal(i18n.setLanguage("system"), "fr-FR", "system choice should resolve through the native locale callback");

const sourceText = "Call of Duty: Black Ops 3 enhanced with our modifications.\n              Experience the full campaign, multiplayer, and zombies modes with\n              improved stability and additional features.";
function findPath(value, expected, prefix = []) {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (child === expected) return [...prefix, key];
    const found = findPath(child, expected, [...prefix, key]);
    if (found) return found;
  }
  return null;
}
const englishCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/launcher/locales/en-US.json"), "utf8"));
const paragraphPath = findPath(englishCatalog.launcher.legacy,
  "Call of Duty: Black Ops 3 enhanced with our modifications. Experience the full campaign, multiplayer, and zombies modes with improved stability and additional features.");
assert.ok(paragraphPath, "English source paragraph should remain in the locale pack");
const expectedParagraph = paragraphPath.reduce((value, key) => value && value[key], catalogs["fr-FR"].launcher.legacy);
assert.ok(expectedParagraph, "existing French paragraph mapping should remain in the locale pack");
const paragraphNode = {
  nodeType: 1,
  tagName: "P",
  className: "",
  childNodes: [],
  parentElement: body,
  hasAttribute: () => false,
  getAttribute: () => null,
};
const paragraphText = { nodeType: 3, nodeValue: sourceText, parentElement: paragraphNode };
paragraphNode.childNodes.push(paragraphText);
body.childNodes.push(paragraphNode);
i18n.setLanguage("fr-FR");
assert.equal(paragraphText.nodeValue, expectedParagraph,
  "legacy text split across source line breaks should match its normalized source entry");

console.log("Launcher i18n runtime checks passed: regional/system resolution, English fallback, placeholders, plurals, UTF-8, and unknown-locale fallback.");
