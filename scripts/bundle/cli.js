#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const program = new Command();

program
  .name('dota')
  .description('DOTA CLI tool for bundling React Native apps with CodePush')
  .version('1.0.0');

program
  .command('bundle')
  .description('Generate a Hermes bundle and assets, compile to HBC and optionally emit sourcemap')
  .requiredOption('--platform <platform>', 'Specify platform: android or ios')
  .option('--bundle-path <path>', 'Directory to place the bundle in, default is .dota/<platform>', '.dota')
  .option('--assets-path <path>', 'Directory to place assets in, default is .dota/<platform>', '.dota')
  .option('--sourcemap-path <path>', 'Directory to place sourcemaps in, default is .dota/<platform>', '.dota')
  .option('--make-sourcemap <boolean>', 'Generate sourcemap: true or false', 'false')
    .option('--entry-file <file>', 'Entry file', 'index.ts')
    .option('--dev <boolean>', 'Development mode', 'false')
    .option('--base-bundle-path <path>', 'Path to base bundle', '')
    .allowUnknownOption() // Allow additional options to be passed to react-native bundle
    .action((options) => {
      // Validate platform
      if (!['android', 'ios'].includes(options.platform)) {
        console.error('Error: Platform must be either "android" or "ios"');
        process.exit(1);
      }

      options.bundlePath = path.join(options.bundlePath, options.platform);
      options.assetsPath = path.join(options.assetsPath, options.platform);
      options.sourcemapPath = path.join(options.sourcemapPath, options.platform);

      // Create necessary directories
      [options.bundlePath, options.assetsPath, options.sourcemapPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        } else {
          fs.rmSync(dir, { recursive: true });
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Set environment variables required by bundle.sh
      process.env.BUNDLE_PATH = options.bundlePath;
      process.env.ASSETS_PATH = options.assetsPath;
      process.env.PLATFORM = options.platform;
      process.env.SOURCE_MAP_PATH = options.sourcemapPath;
      process.env.MAKE_SOURCEMAP = options.makeSourcemap === 'true' ? '1' : '';
      process.env.ENTRY_FILE = options.entryFile;
      process.env.BASE_BUNDLE_PATH = options.baseBundlePath || '';
      // Build the bundle command using the existing script
      const bundleCommand = [
        './node_modules/@d11/dota/scripts/bundle/bundle.sh',
        `--dev ${options.dev}`
      ].filter(Boolean).join(' ');

      try {
        // Execute bundle command
        console.log('Generating bundle...');
        execSync(bundleCommand, { stdio: 'inherit' });

        console.log('Bundle generation completed successfully!');
      } catch (error) {
        console.error('Error during bundle generation:', error.message);
        process.exit(1);
      }
    });

  // Parse arguments
  program.parse(process.argv);
