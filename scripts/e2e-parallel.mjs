#!/usr/bin/env node
/**
 * E2E Test Orchestrator - Runs Android and iOS tests in parallel
 * Supports platform-selective execution via flags
 *
 * Usage:
 *   npm run e2e:parallel                    # Both platforms
 *   npm run e2e:parallel -- --android       # Android only
 *   npm run e2e:parallel -- --ios           # iOS only
 *   npm run e2e:parallel -- --verbose       # Both with verbose output
 */

import { spawn } from 'node:child_process';
import { argv } from 'node:process';

const PLATFORMS = {
  ANDROID: 'android',
  IOS: 'ios',
};

/**
 * Parse CLI arguments to determine which platforms to run
 * @returns {object} {android: bool, ios: bool, verbose: bool}
 */
function parseArgs() {
  const hasAndroid = argv.includes('--android');
  const hasIos = argv.includes('--ios');
  const verbose = argv.includes('--verbose');

  // If neither platform flag is specified, run both (default behavior)
  // If one or both flags are specified, honor them
  const hasPlatformFlags = hasAndroid || hasIos;

  const flags = {
    android: hasPlatformFlags ? hasAndroid : true,   // Run by default, or if --android specified
    ios: hasPlatformFlags ? hasIos : true,           // Run by default, or if --ios specified
    verbose,
  };

  return flags;
}

/**
 * Run a test suite on a specific platform
 * @param {string} platform - 'android' or 'ios'
 * @returns {Promise<object>} {platform, exitCode, output}
 */
function runPlatformTests(platform) {
  return new Promise((resolve) => {
    const npmScript =
      platform === PLATFORMS.ANDROID ? 'verify:e2e-android' : 'verify:e2e-ios';

    console.log(`\n[${'═'.repeat(50)}]`);
    console.log(`[${platform.toUpperCase()}] Starting test suite...`);
    console.log(`[${'═'.repeat(50)}]\n`);

    const child = spawn('npm', ['run', npmScript], {
      cwd: process.cwd(),
      stdio: 'inherit', // Inherit parent's stdio to show output in real-time
    });

    let output = '';

    // Capture any data events (though stdio: 'inherit' won't trigger these)
    child.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        platform,
        exitCode: code,
        output,
      });
    });

    // Handle errors
    child.on('error', (error) => {
      console.error(`[${platform.toUpperCase()}] Process error:`, error.message);
      resolve({
        platform,
        exitCode: 1,
        output: error.message,
      });
    });
  });
}

/**
 * Run both platforms in parallel if specified
 * @param {object} flags - {android, ios, verbose}
 * @returns {Promise<void>}
 */
async function runParallelTests(flags) {
  console.log('\n┌' + '─'.repeat(48) + '┐');
  console.log('│ E2E Test Orchestrator - Running Tests in Parallel │');
  console.log('└' + '─'.repeat(48) + '┘\n');

  if (flags.verbose) {
    console.log('Flags:', flags);
    const platforms = [];
    if (flags.android) platforms.push('Android');
    if (flags.ios) platforms.push('iOS');
    console.log('Platforms:', platforms.join(' + '));
    console.log('');
  }

  const promises = [];
  if (flags.android) promises.push(runPlatformTests(PLATFORMS.ANDROID));
  if (flags.ios) promises.push(runPlatformTests(PLATFORMS.IOS));

  const results = await Promise.all(promises);

  // Aggregate results
  console.log('\n\n' + '═'.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('═'.repeat(60) + '\n');

  let allPassed = true;

  for (const result of results) {
    const status = result.exitCode === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(
      `[${result.platform.toUpperCase()}] ${status} (exit code: ${result.exitCode})`
    );

    if (result.exitCode !== 0) {
      allPassed = false;
    }
  }

  console.log('\n' + '─'.repeat(60));
  if (allPassed) {
    console.log('✓ All tests passed');
    console.log('─'.repeat(60) + '\n');
    console.log('🎉 All platforms passed!\n');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    console.log('─'.repeat(60) + '\n');
    console.log('⚠️  Check output above for details.\n');
    process.exit(1);
  }
}

// Main
const flags = parseArgs();

if (!flags.android && !flags.ios) {
  console.error('Error: Must specify at least one platform');
  console.error('Usage: npm run e2e:parallel [--android] [--ios] [--verbose]');
  process.exit(1);
}

runParallelTests(flags).catch((error) => {
  console.error('Error running tests:', error);
  process.exit(1);
});
