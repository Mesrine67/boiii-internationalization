import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localeRoot = path.join(root, "data", "launcher", "locales");
const manifestPath = path.join(localeRoot, "manifest.json");
const strict = process.argv.includes("--strict");
const strictUnused = process.argv.includes("--strict-unused");
const errors = [];
const warnings = [];

function readUtf8(file) {
  const bytes = fs.readFileSync(file);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function flatten(value, prefix = "", result = new Map()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, child] of Object.entries(value)) {
    if (!prefix && key === "_meta") continue;
    const current = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") result.set(current, child);
    else if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, current, result);
    } else {
      errors.push(`${current}: catalog values must be strings or nested objects`);
    }
  }
  return result;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([A-Za-z0-9_.-]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

function collectFiles(directory, extensions, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(file, extensions, result);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) result.push(file);
  }
  return result;
}

let manifest;
try {
  manifest = JSON.parse(readUtf8(manifestPath));
} catch (error) {
  console.error(`Cannot read locale manifest: ${error.message}`);
  process.exit(1);
}

if (manifest.schemaVersion !== 1 || manifest.sourceLocale !== "en-US" ||
    !manifest.locales || typeof manifest.locales !== "object" ||
    !manifest.locales[manifest.sourceLocale]) {
  errors.push("manifest must use schemaVersion 1 and provide the en-US source locale");
}

const catalogs = new Map();
for (const [locale, entry] of Object.entries(manifest.locales || {})) {
  if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)) {
    errors.push(`invalid BCP-47 locale id: ${locale}`);
    continue;
  }
  if (!entry || entry.file !== `${locale}.json` ||
      !Number.isInteger(entry.translationVersion) || entry.translationVersion < 1 ||
      typeof entry.displayName !== "string" || !entry.displayName.trim()) {
    errors.push(`${locale}: invalid manifest entry or unsafe catalog filename`);
    continue;
  }
  const file = path.join(localeRoot, entry.file);
  let catalog;
  try {
    catalog = JSON.parse(readUtf8(file));
  } catch (error) {
    errors.push(`${locale}: cannot read catalog (${error.message})`);
    continue;
  }
  if (!catalog._meta || catalog._meta.schemaVersion !== 1 ||
      catalog._meta.locale !== locale || catalog._meta.sourceLocale !== "en-US" ||
      catalog._meta.translationVersion !== entry.translationVersion) {
    errors.push(`${locale}: catalog metadata does not match manifest`);
    continue;
  }
  if (!catalog.launcher || typeof catalog.launcher !== "object") {
    errors.push(`${locale}: missing launcher namespace`);
    continue;
  }
  catalogs.set(locale, { catalog, entries: flatten(catalog.launcher) });
}

const source = catalogs.get("en-US");
if (!source) errors.push("English source catalog could not be loaded");

let scanFiles = [
  path.join(root, "data", "launcher", "main.html"),
  path.join(root, "data", "launcher", "main.js"),
  path.join(root, "data", "launcher", "localization.js"),
  ...collectFiles(path.join(root, "src", "client", "launcher"),
    new Set([".cpp", ".hpp", ".h"])),
].filter((file) => fs.existsSync(file));
const scanText = scanFiles.map((file) => {
  try { return readUtf8(file); }
  catch (error) {
    errors.push(`cannot scan ${path.relative(root, file)} as UTF-8: ${error.message}`);
    return "";
  }
}).join("\n");

if (source) {
  const htmlPath = path.join(root, "data", "launcher", "main.html");
  if (fs.existsSync(htmlPath)) {
    const html = readUtf8(htmlPath)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"').replace(/&#39;/g, "'");
    const known = new Set([...source.entries.values()].map((value) => value.replace(/\s+/g, " ").trim()));
    const fragments = new Set();
    const uncovered = new Set();
    for (const match of html.matchAll(/>([^<>]+)</g)) {
      const text = match[1].replace(/\s+/g, " ").trim();
      if (!text || !/[A-Za-zÀ-ÿ]/.test(text)) continue;
      fragments.add(text);
      const openingStart = html.lastIndexOf("<", match.index);
      const openingTag = html.slice(openingStart, match.index + 1);
      const keyMatch = openingTag.match(/\bdata-i18n\s*=\s*["']([^"']+)["']/i);
      const key = keyMatch && keyMatch[1].replace(/^launcher\./, "");
      if (!known.has(text) && !(key && source.entries.has(key))) uncovered.add(text);
    }
    for (const attrMatch of html.matchAll(/\b(title|placeholder|aria-label|alt)\s*=\s*["']([^"']*)["']/gi)) {
      const name = attrMatch[1].toLowerCase();
      const value = attrMatch[2].replace(/\s+/g, " ").trim();
      if (!value || !/[A-Za-zÀ-ÿ]/.test(value)) continue;
      const tagStart = html.lastIndexOf("<", attrMatch.index);
      const tagEnd = html.indexOf(">", attrMatch.index);
      const tag = html.slice(tagStart, tagEnd + 1);
      const keyPattern = new RegExp(`\\bdata-i18n-${name}\\s*=\\s*["']([^"']+)["']`, "i");
      const keyMatch = tag.match(keyPattern);
      const key = keyMatch && keyMatch[1].replace(/^launcher\./, "");
      fragments.add(value);
      if (!known.has(value) && !(key && source.entries.has(key))) uncovered.add(value);
    }
    console.log(`Launcher HTML source scan: ${fragments.size} unique visible text/attribute fragments; ${uncovered.size} not matched to a catalog key/value.`);
    if (uncovered.size) warnings.push(`unmapped static launcher fragments (sample): ${[...uncovered].slice(0, 20).join(" | ")}`);
  }

  for (const [locale, record] of catalogs) {
    if (locale === "en-US") continue;
    const missing = [];
    const extra = [];
    let unchanged = 0;
    for (const [key, sourceValue] of source.entries) {
      const value = record.entries.get(key);
      if (value === undefined || !value.trim()) {
        missing.push(key);
        continue;
      }
      if (value === sourceValue) unchanged++;
      if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(sourceValue))) {
        errors.push(`${locale}:${key}: placeholder names differ from en-US`);
      }
    }
    for (const key of record.entries.keys()) {
      if (!source.entries.has(key)) extra.push(key);
    }
    const translated = source.entries.size - missing.length;
    const percent = source.entries.size
      ? (translated * 100 / source.entries.size).toFixed(1)
      : "100.0";
    console.log(`${locale}: ${translated}/${source.entries.size} keys present (${percent}%), ${missing.length} missing, ${unchanged} unchanged from English, ${extra.length} extra.`);
    if (missing.length) {
      warnings.push(`${locale}: missing keys: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ", …" : ""}`);
      if (strict) errors.push(`${locale}: missing ${missing.length} source keys`);
    }
    if (extra.length) warnings.push(`${locale}: ${extra.length} keys are absent from en-US`);
  }

  const legacy = [...source.entries.entries()].filter(([key]) => key.startsWith("legacy."));
  const normalizedScan = scanText
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/&times;/gi, "×")
    .replace(/\s+/g, " ");
  const unused = legacy.filter(([, english]) => !normalizedScan.includes(english.replace(/\s+/g, " ")));
  console.log(`Legacy source strings: ${legacy.length}; exact source matches not found in scanned launcher/client files: ${unused.length}.`);
  if (unused.length) {
    warnings.push(`unused legacy keys (sample): ${unused.slice(0, 12).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(", ")}`);
    if (strictUnused) errors.push(`${unused.length} legacy source strings were not found in scanned files`);
  }
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
console.log(`Validated ${catalogs.size} launcher catalogs from ${path.relative(root, localeRoot)}.`);
