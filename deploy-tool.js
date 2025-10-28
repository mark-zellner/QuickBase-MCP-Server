#!/usr/bin/env node
/**
 * QuickBase Codepage Deployment Tool
 * 
 * Since QuickBase doesn't provide REST API access to update code pages directly,
 * this tool provides multiple deployment strategies:
 * 
 * 1. Save to management table (for version control/tracking)
 * 2. Generate deployment instructions
 * 3. Open the codepage in browser for manual paste
 * 4. Copy codepage to clipboard
 */

import { program } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import ora from 'ora';
import clipboardy from 'clipboardy';

const execAsync = promisify(exec);

// Deploy command
program
  .command('deploy <file>')
  .description('Deploy a codepage to QuickBase')
  .option('-p, --page-id <id>', 'QuickBase code page ID (pageID parameter)', '2')
  .option('-a, --app-id <id>', 'QuickBase app ID', process.env.QB_APP_ID || 'bvhuaz7pn')
  .option('-r, --realm <realm>', 'QuickBase realm', process.env.QB_REALM || 'vibe.quickbase.com')
  .option('--copy', 'Copy code to clipboard', true)
  .option('--open', 'Open codepage in browser', false)
  .option('--instructions', 'Show deployment instructions', true)
  .action(async (file, options) => {
    const spinner = ora('Preparing deployment...').start();

    try {
      // Read the codepage file
      const filePath = path.resolve(file);
      const code = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(file);

      spinner.succeed(`Loaded ${fileName} (${code.length} characters)`);

      // Copy to clipboard
      if (options.copy) {
        const copySpinner = ora('Copying to clipboard...').start();
        try {
          await clipboardy.write(code);
          copySpinner.succeed(chalk.green('✅ Code copied to clipboard!'));
        } catch (error) {
          copySpinner.fail(chalk.yellow('⚠️  Could not copy to clipboard'));
          console.log(chalk.yellow(`   Error: ${error.message}`));
        }
      }

      // Build URLs
      const codepageEditUrl = `https://${options.realm}/db/${options.appId}?a=dbpage&pageID=${options.pageId}&edit=1`;
      const codepageViewUrl = `https://${options.realm}/db/${options.appId}?a=dbpage&pageID=${options.pageId}`;

      // Show deployment instructions
      if (options.instructions) {
        console.log(chalk.blue.bold('\n📋 Deployment Instructions:\n'));
        console.log(chalk.white('1. ') + chalk.cyan('Code has been copied to your clipboard'));
        console.log(chalk.white('2. ') + chalk.cyan('Open the codepage editor:'));
        console.log(chalk.gray(`   ${codepageEditUrl}`));
        console.log(chalk.white('3. ') + chalk.cyan('Select all existing code (Ctrl+A)'));
        console.log(chalk.white('4. ') + chalk.cyan('Paste the new code (Ctrl+V)'));
        console.log(chalk.white('5. ') + chalk.cyan('Click "Save & Close"'));
        console.log(chalk.white('6. ') + chalk.cyan('Test the deployed codepage:'));
        console.log(chalk.gray(`   ${codepageViewUrl}\n`));
      }

      // Open in browser
      if (options.open) {
        const openSpinner = ora('Opening codepage in browser...').start();
        try {
          const command = process.platform === 'win32' 
            ? `start ${codepageEditUrl}`
            : process.platform === 'darwin'
            ? `open ${codepageEditUrl}`
            : `xdg-open ${codepageEditUrl}`;
          
          await execAsync(command);
          openSpinner.succeed(chalk.green('✅ Opened codepage in browser'));
        } catch (error) {
          openSpinner.fail(chalk.yellow('⚠️  Could not open browser'));
          console.log(chalk.yellow(`   Error: ${error.message}`));
        }
      }

      // Summary
      console.log(chalk.green.bold('\n🎉 Deployment prepared successfully!\n'));
      console.log(chalk.blue('Codepage Details:'));
      console.log(chalk.white(`  File: ${fileName}`));
      console.log(chalk.white(`  Size: ${code.length} characters`));
      console.log(chalk.white(`  Page ID: ${options.pageId}`));
      console.log(chalk.white(`  App ID: ${options.appId}`));
      console.log(chalk.white(`  Realm: ${options.realm}\n`));

    } catch (error) {
      spinner.fail(chalk.red('Deployment preparation failed'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Test command - opens the deployed codepage
program
  .command('test')
  .description('Open the deployed codepage for testing')
  .option('-p, --page-id <id>', 'QuickBase code page ID', '2')
  .option('-a, --app-id <id>', 'QuickBase app ID', process.env.QB_APP_ID || 'bvhuaz7pn')
  .option('-r, --realm <realm>', 'QuickBase realm', process.env.QB_REALM || 'vibe.quickbase.com')
  .action(async (options) => {
    const codepageUrl = `https://${options.realm}/db/${options.appId}?a=dbpage&pageID=${options.pageId}`;
    
    console.log(chalk.blue(`\n🔍 Opening codepage for testing...\n`));
    console.log(chalk.white(`URL: ${codepageUrl}\n`));

    try {
      const command = process.platform === 'win32' 
        ? `start ${codepageUrl}`
        : process.platform === 'darwin'
        ? `open ${codepageUrl}`
        : `xdg-open ${codepageUrl}`;
      
      await execAsync(command);
      console.log(chalk.green('✅ Opened in browser\n'));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not open browser automatically`));
      console.log(chalk.yellow(`   Please open manually: ${codepageUrl}\n`));
    }
  });

// Diff command - compare local file with deployed version
program
  .command('diff <file>')
  .description('Compare local file with last deployment')
  .option('--saved-version <file>', 'Path to saved deployed version')
  .action(async (file, options) => {
    console.log(chalk.blue('\n📊 Comparing versions...\n'));

    try {
      const currentCode = await fs.readFile(path.resolve(file), 'utf-8');
      
      if (options.savedVersion) {
        const savedCode = await fs.readFile(path.resolve(options.savedVersion), 'utf-8');
        
        const currentLines = currentCode.split('\n').length;
        const savedLines = savedCode.split('\n').length;
        const lineDiff = currentLines - savedLines;
        const charDiff = currentCode.length - savedCode.length;

        console.log(chalk.white(`Current file: ${currentLines} lines, ${currentCode.length} characters`));
        console.log(chalk.white(`Saved version: ${savedLines} lines, ${savedCode.length} characters`));
        console.log(chalk.white(`Difference: ${lineDiff > 0 ? '+' : ''}${lineDiff} lines, ${charDiff > 0 ? '+' : ''}${charDiff} characters\n`));

        if (currentCode === savedCode) {
          console.log(chalk.green('✅ Files are identical - no changes detected\n'));
        } else {
          console.log(chalk.yellow('⚠️  Files differ - deployment recommended\n'));
        }
      } else {
        console.log(chalk.white(`File: ${file}`));
        console.log(chalk.white(`Lines: ${currentCode.split('\n').length}`));
        console.log(chalk.white(`Characters: ${currentCode.length}\n`));
        console.log(chalk.yellow('ℹ️  Use --saved-version to compare with previous deployment\n'));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Save snapshot command - save deployed version for tracking
program
  .command('snapshot <file>')
  .description('Save a deployment snapshot for version tracking')
  .option('-o, --output <file>', 'Output file path', 'deployments/snapshot-{timestamp}.html')
  .action(async (file, options) => {
    const spinner = ora('Creating deployment snapshot...').start();

    try {
      const code = await fs.readFile(path.resolve(file), 'utf-8');
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const outputPath = options.output.replace('{timestamp}', timestamp);
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Save snapshot
      await fs.writeFile(outputPath, code, 'utf-8');

      spinner.succeed(chalk.green(`✅ Snapshot saved: ${outputPath}`));
      
      // Add metadata comment
      const metadata = `\n<!-- Deployment Snapshot\n     Timestamp: ${new Date().toISOString()}\n     Source: ${file}\n     Size: ${code.length} characters\n-->\n`;
      await fs.appendFile(outputPath, metadata, 'utf-8');

      console.log(chalk.blue(`\nSnapshot details:`));
      console.log(chalk.white(`  File: ${outputPath}`));
      console.log(chalk.white(`  Size: ${code.length} characters`));
      console.log(chalk.white(`  Timestamp: ${timestamp}\n`));

    } catch (error) {
      spinner.fail(chalk.red('Snapshot creation failed'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Configure program
program
  .name('qb-deploy')
  .description('QuickBase Codepage Deployment Tool')
  .version('1.0.0');

program.parse();
