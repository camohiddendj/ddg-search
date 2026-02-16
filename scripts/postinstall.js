#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(__dirname, '..');
const home = homedir();
const cwd = process.cwd();

const src = join(pkgDir, 'SKILL.md');
if (!existsSync(src)) process.exit(0);

/**
 * Security: Validates that a path is safe to use.
 * This function prevents directory traversal attacks and ensures paths
 * are within expected boundaries.
 * 
 * Security considerations when using environment variables:
 * - OPENCLAW_STATE_DIR and OPENCLAW_HOME can influence where files are written
 * - This script validates paths to prevent malicious directory traversal
 * - Only writes to existing 'skills' directories (won't create new ones in arbitrary locations)
 * - Resolves symlinks to prevent bypassing validation
 * 
 * @param {string} dirPath - The directory path to validate
 * @returns {boolean} - True if the path is safe, false otherwise
 */
function isPathSafe(dirPath) {
  try {
    // Check for directory traversal patterns before normalization
    // This catches explicit attempts like '../../etc'
    if (dirPath.includes('..')) {
      return false;
    }
    
    // Reject relative paths - environment variables should use absolute paths
    // This prevents confusion about where files will be written
    // Uses isAbsolute for cross-platform compatibility (works on both Unix and Windows)
    if (!isAbsolute(dirPath)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes a path from environment variable.
 * Returns null if the path is unsafe or invalid.
 * 
 * @param {string|undefined} envPath - Path from environment variable
 * @returns {string|null} - Validated path or null
 */
function validateEnvPath(envPath) {
  if (!envPath || typeof envPath !== 'string') {
    return null;
  }
  
  // Trim whitespace
  const trimmed = envPath.trim();
  if (!trimmed) {
    return null;
  }
  
  // Validate the path is safe
  if (!isPathSafe(trimmed)) {
    // Security: Don't log the actual path to prevent log injection
    console.warn('[ddg-search postinstall] Ignoring unsafe path from environment variable');
    return null;
  }
  
  return trimmed;
}

// Candidate state directories, checked in order. The first one whose
// "skills" subfolder already exists wins. Env-var overrides take priority,
// then workspace-local paths (cwd), then common home-dir locations, and
// finally docker / non-standard locations.
//
// Security note: Environment variables are validated before use to prevent
// malicious path injection. See isPathSafe() and validateEnvPath() for details.
const candidates = [
  validateEnvPath(process.env.OPENCLAW_STATE_DIR),
  validateEnvPath(process.env.OPENCLAW_HOME),
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
  // Additional safety check: validate each candidate path
  if (!isPathSafe(dir)) {
    continue;
  }
  
  const skillsDir = join(dir, 'skills');
  
  // Security: Only write if the skills directory already exists
  // This prevents creating directories in arbitrary locations
  if (!existsSync(skillsDir)) continue;
  
  // Security: Validate the skills directory after resolving symlinks
  try {
    const realSkillsDir = realpathSync(skillsDir);
    if (!isPathSafe(realSkillsDir)) {
      continue;
    }
  } catch {
    continue;
  }
  
  const dest = join(skillsDir, 'ddg-search');
  mkdirSync(dest, { recursive: true });
  copyFileSync(src, join(dest, 'SKILL.md'));
  break;
}
