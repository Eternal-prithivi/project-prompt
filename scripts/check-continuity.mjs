import { execSync } from 'node:child_process';
import fs from 'node:fs';

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();
}

function getChangedFiles(baseSha, headSha) {
  const out = sh(`git diff --name-only ${baseSha}..${headSha}`);
  return out ? out.split('\n').filter(Boolean) : [];
}

function hasAnyChanged(changedFiles, predicate) {
  return changedFiles.some(predicate);
}

function ensure(condition, message) {
  if (!condition) {
    console.error(`\n[continuity-check] FAIL: ${message}\n`);
    process.exitCode = 1;
  }
}

function fileContains(path, regex) {
  try {
    const text = fs.readFileSync(path, 'utf8');
    return regex.test(text);
  } catch {
    return false;
  }
}

function main() {
  const baseSha = process.env.CONTINUITY_BASE_SHA;
  const headSha = process.env.CONTINUITY_HEAD_SHA;

  // Local/dev convenience: allow running without env vars by diffing the working tree.
  const localMode = !baseSha || !headSha;

  const changed = localMode
    ? sh('git diff --name-only').split('\n').filter(Boolean)
    : getChangedFiles(baseSha, headSha);
  const changedSet = new Set(changed);

  const codeChanged = hasAnyChanged(changed, (p) =>
    p.startsWith('src/') ||
    p === 'package.json' ||
    p === 'package-lock.json' ||
    p === 'vite.config.ts' ||
    p === 'tsconfig.json'
  );

  if (!codeChanged) {
    console.log('[continuity-check] No code changes detected; skipping continuity enforcement.');
    return;
  }

  ensure(
    changedSet.has('PROGRESS.md'),
    'Code changed but PROGRESS.md was not updated.'
  );

  ensure(
    changedSet.has('AUDIT_LOG.md'),
    'Code changed but AUDIT_LOG.md was not updated (append a session entry).'
  );

  // SCRATCHPAD must be cleared before merging when code changed
  const scratchOk =
    fileContains('SCRATCHPAD.md', /No active task\./i) ||
    fileContains('SCRATCHPAD.md', /No active task\b/i);
  ensure(
    scratchOk,
    'SCRATCHPAD.md must be cleared ("No active task.") before merging code changes.'
  );

  // Require SESSION_ID somewhere in AUDIT_LOG.md when it changes.
  ensure(
    fileContains('AUDIT_LOG.md', /\bSESSION_ID\b/),
    'AUDIT_LOG.md must include SESSION_ID in the session entry.'
  );

  console.log('[continuity-check] PASS');
}

main();

