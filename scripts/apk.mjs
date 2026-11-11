// Builds a debug APK for manual testing on a device.
//
// Steps: production web build -> `cap sync android` -> Gradle `assembleDebug`
// -> copy the result to apk/gestor-resmas-debug.apk (ignored by git).
//
// Gradle 8.14 (Capacitor 8 template) runs on Java 21 to 24, so a newer
// default JDK cannot be used. The JDK is chosen from, in order:
// APK_JAVA_HOME, JAVA_HOME, Android Studio's bundled JBR and installed JDKs.
// The Android SDK comes from ANDROID_HOME, ANDROID_SDK_ROOT or the default
// Android Studio location.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_JAVA = 21;
const MAX_JAVA = 24;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const isWindows = platform() === 'win32';
const apkSource = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkTarget = join(root, 'apk', 'gestor-resmas-debug.apk');

function fail(message) {
  console.error(`\n[apk] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n[apk] > ${command} ${args.join(' ')}`);
  // Windows needs a shell to run .cmd/.bat files (npm, npx, gradlew.bat). The
  // arguments are fixed literals, so they are joined into a single command line.
  const result = isWindows
    ? spawnSync([command, ...args].join(' '), { stdio: 'inherit', shell: true, ...options })
    : spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    fail(`"${command} ${args.join(' ')}" could not start: ${result.error.message}`);
  }
  if (result.signal) {
    fail(`"${command} ${args.join(' ')}" was stopped by signal ${result.signal}.`);
  }
  if (result.status !== 0) {
    fail(`"${command} ${args.join(' ')}" failed with exit code ${result.status}.`);
  }
}

function javaMajorVersion(javaHome) {
  const javaBin = join(javaHome, 'bin', isWindows ? 'java.exe' : 'java');
  if (!existsSync(javaBin)) {
    return null;
  }
  const result = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const match = /version "(\d+)(?:\.(\d+))?/.exec(`${result.stderr}${result.stdout}`);
  if (!match) {
    return null;
  }
  const major = Number(match[1]);
  return major === 1 ? Number(match[2]) : major;
}

function installedJdkCandidates() {
  const parents = isWindows
    ? ['C:/Program Files/Java', 'C:/Program Files/Eclipse Adoptium', 'C:/Program Files/Microsoft']
    : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'];
  return parents.filter(existsSync).flatMap((parent) =>
    readdirSync(parent).map((name) => {
      const home = join(parent, name);
      const macHome = join(home, 'Contents', 'Home');
      return existsSync(macHome) ? macHome : home;
    }),
  );
}

function findJavaHome() {
  const androidStudioJbr = isWindows
    ? 'C:/Program Files/Android/Android Studio/jbr'
    : platform() === 'darwin'
      ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home'
      : '/opt/android-studio/jbr';
  const candidates = [
    process.env.APK_JAVA_HOME,
    process.env.JAVA_HOME,
    androidStudioJbr,
    ...installedJdkCandidates(),
  ].filter(Boolean);

  const checked = [];
  for (const candidate of candidates) {
    const major = javaMajorVersion(candidate);
    checked.push(`${candidate} (${major ?? 'no java'})`);
    if (major !== null && major >= MIN_JAVA && major <= MAX_JAVA) {
      return { home: candidate, major };
    }
  }
  fail(
    `No JDK between ${MIN_JAVA} and ${MAX_JAVA} was found. Install JDK 21 or set APK_JAVA_HOME.\n` +
      `Checked:\n  ${checked.join('\n  ')}`,
  );
}

function findAndroidSdk() {
  const defaultSdk = isWindows
    ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk')
    : platform() === 'darwin'
      ? join(homedir(), 'Library', 'Android', 'sdk')
      : join(homedir(), 'Android', 'Sdk');
  const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, defaultSdk].find(
    (path) => path && existsSync(path),
  );
  if (!sdk) {
    fail('Android SDK not found. Install it with Android Studio or set ANDROID_HOME.');
  }
  return sdk;
}

// Points android/local.properties at the detected SDK so Gradle builds with the
// same SDK this script reports. Other keys in the file are kept.
function ensureLocalProperties(sdk) {
  const localProperties = join(androidDir, 'local.properties');
  // Backslashes are escape characters in .properties files, so use forward slashes.
  const sdkLine = `sdk.dir=${sdk.replaceAll('\\', '/')}`;
  const lines = existsSync(localProperties) ? readFileSync(localProperties, 'utf8').split(/\r?\n/) : [];
  if (lines.includes(sdkLine)) {
    return;
  }
  const otherLines = lines.filter((line) => line.trim() !== '' && !line.startsWith('sdk.dir='));
  writeFileSync(localProperties, [...otherLines, sdkLine].join('\n') + '\n', 'utf8');
  console.log(`[apk] Updated android/local.properties (${sdkLine})`);
}

if (!existsSync(androidDir)) {
  fail('The android/ folder is missing. Run "npx cap add android" first.');
}

const java = findJavaHome();
const sdk = findAndroidSdk();
console.log(`[apk] JDK ${java.major}: ${java.home}`);
console.log(`[apk] Android SDK: ${sdk}`);
ensureLocalProperties(sdk);

run('npm', ['run', 'build'], { cwd: root });
run('npx', ['cap', 'sync', 'android'], { cwd: root });
// cmd.exe may not search the working directory, so use the absolute (quoted) path.
const gradlew = isWindows ? `"${join(androidDir, 'gradlew.bat')}"` : './gradlew';
run(gradlew, ['assembleDebug', '--no-daemon'], {
  cwd: androidDir,
  env: { ...process.env, JAVA_HOME: java.home },
});

if (!existsSync(apkSource)) {
  fail(`Gradle finished but ${apkSource} does not exist.`);
}
mkdirSync(dirname(apkTarget), { recursive: true });
copyFileSync(apkSource, apkTarget);
console.log(`\n[apk] Debug APK ready: ${apkTarget}`);
