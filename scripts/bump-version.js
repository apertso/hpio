const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/bump-version.js <version>');
  console.error('Example: node scripts/bump-version.js 0.3.0');
  console.error('         node scripts/bump-version.js patch');
  console.error('         node scripts/bump-version.js minor');
  console.error('         node scripts/bump-version.js major');
  process.exit(1);
}

const versionArg = args[0];

function getCurrentVersion() {
  const packageJsonPath = path.resolve(__dirname, '../frontend/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Expected format: X.Y.Z`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return type;
  }
}

function calculateVersionCode(version) {
  const { major, minor, patch } = parseVersion(version);
  return major * 1000 + minor * 100 + patch * 10;
}

function updateJsonFile(filePath, version) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  content.version = version;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated ${path.relative(process.cwd(), filePath)}`);
}

function updateCargoToml(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Updated ${path.relative(process.cwd(), filePath)}`);
}

function updateTauriProperties(filePath, version, versionCode) {
  const content = `tauri.android.versionCode=${versionCode}\ntauri.android.versionName=${version}\n`;
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Updated ${path.relative(process.cwd(), filePath)}`);
}

function gitCommitAndTag(version) {
  try {
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    execSync(`git tag v${version}`, { stdio: 'inherit' });
    console.log(`\n✓ Created commit and tag v${version}`);
    console.log('\nTo push the changes and tag, run:');
    console.log(`  git push && git push origin v${version}`);
  } catch (error) {
    console.error('\n✗ Failed to create git commit/tag');
    console.error('You may need to commit manually');
  }
}

try {
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, versionArg);
  const versionCode = calculateVersionCode(newVersion);

  console.log(`\nBumping version: ${currentVersion} → ${newVersion}`);
  console.log(`Android versionCode: ${versionCode}\n`);

  parseVersion(newVersion);

  const frontendPackageJson = path.resolve(__dirname, '../frontend/package.json');
  const backendPackageJson = path.resolve(__dirname, '../backend/package.json');
  const cargoToml = path.resolve(__dirname, '../frontend/src-tauri/Cargo.toml');
  const tauriProperties = path.resolve(__dirname, '../frontend/src-tauri/gen/android/app/tauri.properties');

  updateJsonFile(frontendPackageJson, newVersion);
  updateJsonFile(backendPackageJson, newVersion);
  updateCargoToml(cargoToml, newVersion);
  updateTauriProperties(tauriProperties, newVersion, versionCode);

  console.log('\n✓ All files updated successfully\n');

  const shouldCommit = process.env.NO_COMMIT !== 'true';
  if (shouldCommit) {
    gitCommitAndTag(newVersion);
  } else {
    console.log('Skipping git commit (NO_COMMIT=true)');
  }
} catch (error) {
  console.error(`\n✗ Error: ${error.message}`);
  process.exit(1);
}

