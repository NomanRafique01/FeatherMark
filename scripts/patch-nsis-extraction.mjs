#!/usr/bin/env node
// Makes electron-builder's NSIS payload extraction visible: the stock template
// unpacks the whole app as one silent 7z call, so the wizard's progress bar
// stalls with no file list. Runs before electron-builder because a fresh
// `npm ci` restores the untouched template.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "FeatherMark: streamed extraction";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(
  root,
  "node_modules",
  "app-builder-lib",
  "templates",
  "nsis",
  "include",
  "extractAppPackage.nsh",
);

function fail(reason) {
  let version = "unknown";
  try {
    version = JSON.parse(readFileSync(join(root, "node_modules/app-builder-lib/package.json"), "utf8")).version;
  } catch {}
  console.error(
    [
      `patch-nsis-extraction: ${reason}`,
      `  template: ${templatePath}`,
      `  app-builder-lib: ${version}`,
      "  app-builder-lib's NSIS template changed — re-verify this patch before shipping,",
      "  otherwise the installer silently loses its streamed extraction progress.",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(templatePath)) fail("template file not found (is node_modules installed?)");

const source = readFileSync(templatePath, "utf8");
if (source.includes(MARKER)) {
  console.log("patch-nsis-extraction: already applied");
  process.exit(0);
}

const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

// The two-space-indented call is the atomic staged extract inside
// extractUsing7za. The four-space one further down is the last-resort
// non-atomic fallback and stays untouched.
const extractIndex = lines.findIndex((line) => line === '  Nsis7z::Extract "${FILE}"');
if (extractIndex === -1) fail('could not find the staged extract call `  Nsis7z::Extract "${FILE}"`');

lines.splice(extractIndex, 1, [
  `  ; ${MARKER} - name every entry as it unpacks instead of one silent block.`,
  "  SetDetailsPrint both",
  '  Nsis7z::ExtractWithDetails "${FILE}" "Extracting application files: %s"',
].join(eol));

// The `CopyFiles /SILENT` below is left alone on purpose: dropping /SILENT shows
// a native Windows copy dialog and makes the copy cancellable, which would feed
// the retry loop as if the app were still running.

writeFileSync(templatePath, lines.join(eol));
console.log(`patch-nsis-extraction: applied to ${templatePath}`);
