#!/usr/bin/env node

const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const versionType = process.argv[2];

if (!versionType) {
  console.error('❌ Usage: node version.js <patch|minor|major|alpha|beta|rc>');
  process.exit(1);
}

const validTypes = ['patch', 'minor', 'major', 'alpha', 'beta', 'rc'];
if (!validTypes.includes(versionType)) {
  console.error(`❌ Invalid version type. Must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Read current package.json to get version
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

// Calculate new version
let newVersion;
const versionMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(\w+)\.(\d+))?$/);

if (!versionMatch) {
  console.error(`❌ Invalid current version format: ${currentVersion}`);
  process.exit(1);
}

const [, major, minor, patch, preId, preNumber] = versionMatch;
const majorNum = Number.parseInt(major, 10);
const minorNum = Number.parseInt(minor, 10);
const patchNum = Number.parseInt(patch, 10);
const preNum = preNumber ? Number.parseInt(preNumber, 10) : 0;

switch (versionType) {
  case 'patch':
    newVersion = `${majorNum}.${minorNum}.${patchNum + 1}`;
    break;
  case 'minor':
    newVersion = `${majorNum}.${minorNum + 1}.0`;
    break;
  case 'major':
    newVersion = `${majorNum + 1}.0.0`;
    break;
  case 'alpha':
  case 'beta':
  case 'rc':
    if (preId === versionType) {
      // Increment existing prerelease
      newVersion = `${majorNum}.${minorNum}.${patchNum}-${versionType}.${preNum + 1}`;
    } else {
      // Start new prerelease from current version
      const baseVersion = preId ? `${majorNum}.${minorNum}.${patchNum}` : `${majorNum}.${minorNum}.${patchNum + 1}`;
      newVersion = `${baseVersion}-${versionType}.1`;
    }
    break;
}

console.log(`\n📦 Bumping version from ${currentVersion} to ${newVersion}\n`);

// Update package.json using sed to preserve formatting
execSync(`sed -i 's/"version": "[^"]*"/"version": "${newVersion}"/g' package.json`);

// Update jsr.json using sed to preserve formatting
execSync(`sed -i 's/"version": "[^"]*"/"version": "${newVersion}"/g' jsr.json`);

// Git operations
try {
  execSync('git add package.json jsr.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });

  console.log(`\n✅ Version bumped to ${newVersion}`);
  console.log('\n📌 To publish, run: git push origin main --tags\n');
} catch (error) {
  console.error('\n❌ Git operations failed:', error.message);
  process.exit(1);
}
