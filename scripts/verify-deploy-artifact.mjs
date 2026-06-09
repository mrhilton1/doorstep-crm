import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');

const forbiddenBasenames = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'DO_NOT_TOUCH.md',
  'ENVIRONMENT.md',
  'SCRATCHPAD.md',
  'decisions.md',
]);

const forbiddenDirectoryNames = new Set([
  '.git',
  'docs',
  'node_modules',
  'specs',
]);

const forbiddenTextMarkers = [
  'Spec-Driven AI Engineering',
  'Architectural Decision Log',
  'Agent Operating File',
  'Do Not Touch Without Explicit Approval',
];

const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(distDir, fullPath);

    if (entry.isDirectory()) {
      if (forbiddenDirectoryNames.has(entry.name)) {
        violations.push(`Forbidden directory in deploy artifact: ${relativePath}`);
        continue;
      }

      await walk(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;

    if (entry.name.endsWith('.md')) {
      violations.push(`Markdown file in deploy artifact: ${relativePath}`);
    }

    if (forbiddenBasenames.has(entry.name)) {
      violations.push(`Private strategy file in deploy artifact: ${relativePath}`);
    }

    const fileStat = await stat(fullPath);
    if (fileStat.size > 2_000_000) continue;

    const content = await readFile(fullPath, 'utf8').catch(() => '');
    for (const marker of forbiddenTextMarkers) {
      if (content.includes(marker)) {
        violations.push(`Private strategy marker "${marker}" found in: ${relativePath}`);
      }
    }
  }
}

try {
  await stat(distDir);
} catch {
  console.error('Deploy artifact verification failed: dist/ does not exist. Run npm run build first.');
  process.exit(1);
}

await walk(distDir);

if (violations.length > 0) {
  console.error('Deploy artifact verification failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Deploy artifact verification passed: no private spec or strategy files found in dist/.');
