#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(__dirname, '..');
const home = homedir();
const cwd = process.cwd();

const src = join(pkgDir, 'SKILL.md');
if (!existsSync(src)) process.exit(0);

// Candidate state directories, checked in order. The first one whose
// "skills" subfolder already exists wins. Env-var overrides take priority,
// then workspace-local paths (cwd), then common home-dir locations, and
// finally docker / non-standard locations.
const candidates = [
  process.env.OPENCLAW_STATE_DIR,
  process.env.OPENCLAW_HOME,
  join(cwd, '.openclaw'),
  join(cwd, 'openclaw'),
  join(home, '.openclaw'),
  join(home, 'openclaw'),
  '/home/openclaw',
  '/home/linuxbrew/.openclaw',
  '/home/linuxbrew/openclaw',
  '/openclaw',
  '/.openclaw',
].filter(Boolean);

for (const dir of candidates) {
  const skillsDir = join(dir, 'skills');
  if (!existsSync(skillsDir)) continue;

  const dest = join(skillsDir, 'ddg-search');
  mkdirSync(dest, { recursive: true });
  copyFileSync(src, join(dest, 'SKILL.md'));
  break;
}
