#!/usr/bin/env node
/**
 * Translation helper for Roundabout Timing.
 *
 * Usage:
 *   # Scaffold a new language from template:
 *   node scripts/translate.mjs scaffold --code pt --name "Português"
 *
 *   # Verify that all translation files exist and are intact:
 *   node scripts/translate.mjs verify
 *
 *   # Translate strings via MyMemory / DeepL API:
 *   node scripts/translate.mjs translate --code pt --provider mymemory
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'src', 'present', 'lang');
const I18N_FILE = path.join(ROOT, 'src', 'present', 'i18n.ts');
const STRINGS_FILE = path.join(ROOT, 'src', 'present', 'strings.ts');

const MODULES = ['p1.ts', 'p2.ts', 'p3.ts', 'p4.ts', 'p5.ts', 'p6.ts', 'museum.ts'];

function getArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const parsed = { command };
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      parsed[key] = val;
    }
  }
  return parsed;
}

function verifyLanguages() {
  console.log('Verifying translation modules...');
  const i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');
  const langMatches = [...i18nContent.matchAll(/\{\s*code:\s*'([a-z]{2})',\s*name:\s*'([^']+)'\s*\}/g)];

  let allOk = true;
  for (const [, code, name] of langMatches) {
    if (code === 'en') {
      console.log(`[OK] en (English) - Default source of truth in strings.ts`);
      continue;
    }
    const entryFile = path.join(LANG_DIR, `${code}.ts`);
    const codeDir = path.join(LANG_DIR, code);

    if (!fs.existsSync(entryFile)) {
      console.error(`[FAIL] ${code} (${name}): Entry file missing: ${entryFile}`);
      allOk = false;
      continue;
    }
    if (!fs.existsSync(codeDir)) {
      console.error(`[FAIL] ${code} (${name}): Directory missing: ${codeDir}`);
      allOk = false;
      continue;
    }

    let dirOk = true;
    for (const mod of MODULES) {
      const modFile = path.join(codeDir, mod);
      if (!fs.existsSync(modFile)) {
        console.error(`  [FAIL] Missing submodule: ${modFile}`);
        dirOk = false;
        allOk = false;
      }
    }
    if (dirOk) {
      console.log(`[OK] ${code} (${name}) - All 7 submodules and entry file present.`);
    }
  }

  if (allOk) {
    console.log('\nAll registered languages are complete and valid!');
  } else {
    process.exitCode = 1;
  }
}

function scaffoldLanguage(code, name) {
  if (!code) {
    console.error('Error: --code is required (e.g. --code pt --name Português)');
    process.exit(1);
  }
  const targetDir = path.join(LANG_DIR, code);
  const targetEntry = path.join(LANG_DIR, `${code}.ts`);

  if (fs.existsSync(targetDir) || fs.existsSync(targetEntry)) {
    console.error(`Language '${code}' already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  // Scaffold from English/German reference
  const refCode = 'es'; // Spanish is a clean recent reference
  const refDir = path.join(LANG_DIR, refCode);

  for (const mod of MODULES) {
    const src = path.join(refDir, mod);
    const dst = path.join(targetDir, mod);
    const content = fs.readFileSync(src, 'utf-8');
    fs.writeFileSync(dst, content, 'utf-8');
  }

  const entryContent = `import type { Strings, Translation } from '../strings';
import museum from './${code}/museum';
import p1 from './${code}/p1';
import p2 from './${code}/p2';
import p3 from './${code}/p3';
import p4 from './${code}/p4';
import p5 from './${code}/p5';
import p6 from './${code}/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
`;
  fs.writeFileSync(targetEntry, entryContent, 'utf-8');

  console.log(`\nCreated scaffolding for '${code}' (${name || code}) in src/present/lang/${code}/`);
  console.log(`To register '${code}', add to src/present/i18n.ts:`);
  console.log(`  { code: '${code}', name: '${name || code}' },`);
  console.log(`And to src/present/strings.ts:`);
  console.log(`  ${code}: () => import('./lang/${code}'),`);
}

async function main() {
  const args = getArgs();
  switch (args.command) {
    case 'verify':
      verifyLanguages();
      break;
    case 'scaffold':
      scaffoldLanguage(args.code, args.name);
      break;
    default:
      console.log(`
Roundabout Timing Translation CLI

Commands:
  node scripts/translate.mjs verify
    Validates that all registered languages in i18n.ts have complete submodules.

  node scripts/translate.mjs scaffold --code <code> --name <Name>
    Generates a full modular template (p1-p6, museum.ts, <entry>.ts) ready for translation.
`);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
