#!/usr/bin/env node
/**
 * Automated QuickBase Codepage Deployment Script
 * 
 * This script fully automates the deployment of codepages to QuickBase,
 * including saving to the management table and generating deployment assets.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { QuickBaseClient } from './dist/quickbase/client.js';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import clipboardy from 'clipboardy';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log(chalk.blue('Usage: node deploy-automated.js <file> [options]'));
    console.log(chalk.white('\nOptions:'));
    console.log(chalk.white('  --page-id <id>       QuickBase page ID (default: 2)'));
    console.log(chalk.white('  --name <name>        Codepage name'));
    console.log(chalk.white('  --version <version>  Version number'));
    console.log(chalk.white('  --description <desc> Description'));
    console.log(chalk.white('  --no-copy            Skip clipboard copy'));
    console.log(chalk.white('  --no-save            Skip saving to management table'));
    console.log(chalk.white('\nExample:'));
    console.log(chalk.gray('  node deploy-automated.js MyDealership.html --page-id 2 --version 2.0.0'));
    process.exit(0);
}

const filePath = path.resolve(args[0]);
const options = {
    pageId: '2',
    name: path.basename(args[0], path.extname(args[0])),
    version: '1.0.0',
    description: '',
    copy: true,
    save: true
};

// Parse options
for (let i = 1; i < args.length; i++) {
    if (args[i] === '--page-id' && args[i + 1]) {
        options.pageId = args[++i];
    } else if (args[i] === '--name' && args[i + 1]) {
        options.name = args[++i];
    } else if (args[i] === '--version' && args[i + 1]) {
        options.version = args[++i];
    } else if (args[i] === '--description' && args[i + 1]) {
        options.description = args[++i];
    } else if (args[i] === '--no-copy') {
        options.copy = false;
    } else if (args[i] === '--no-save') {
        options.save = false;
    }
}

async function deploy() {
    console.log(chalk.blue.bold('\n🚀 QuickBase Automated Deployment\n'));

    const spinner = ora('Loading codepage file...').start();

    try {
        // Read the file
        const code = await fs.readFile(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        spinner.succeed(`Loaded ${fileName} (${code.length.toLocaleString()} characters)`);

        // Step 1: Copy to clipboard
        if (options.copy) {
            const copySpinner = ora('Copying code to clipboard...').start();
            try {
                await clipboardy.write(code);
                copySpinner.succeed(chalk.green('✅ Code copied to clipboard'));
            } catch (error) {
                copySpinner.warn(chalk.yellow(`⚠️  Could not copy to clipboard: ${error.message}`));
            }
        }

        // Step 2: Save to management table
        if (options.save) {
            const saveSpinner = ora('Saving to QuickBase management table...').start();
            try {
                const client = new QuickBaseClient({
                    realm: process.env.QB_REALM,
                    userToken: process.env.QB_USER_TOKEN,
                    appId: process.env.QB_APP_ID,
                    timeout: Number.parseInt(process.env.QB_DEFAULT_TIMEOUT || '30000'),
                    maxRetries: Number.parseInt(process.env.QB_MAX_RETRIES || '3')
                });

                const recordData = {
                    fields: {
                        [6]: { value: options.name },  // Name
                        [7]: { value: code },           // Code
                        [8]: { value: options.description || `Deployment of ${fileName}` },  // Description
                        [9]: { value: options.version }, // Version
                        [10]: { value: ['automated-deployment', 'production'] }, // Tags
                        [12]: { value: process.env.PRICING_TABLE_ID || 'bvhuaz8wz' }, // Target table
                        [13]: { value: true }  // Active
                    }
                };

                const recordId = await client.createRecord('bltcpt7da', recordData);
                saveSpinner.succeed(chalk.green(`✅ Saved to management table (Record ID: ${recordId})`));

            } catch (error) {
                saveSpinner.warn(chalk.yellow(`⚠️  Could not save to table: ${error.message}`));
            }
        }

        // Step 3: Create deployment snapshot
        const snapshotSpinner = ora('Creating deployment snapshot...').start();
        try {
            const timestamp = new Date().toISOString().replaceAll(':', '-').split('.')[0];
            const snapshotDir = path.join(process.cwd(), 'deployments');
            await fs.mkdir(snapshotDir, { recursive: true });

            const snapshotPath = path.join(snapshotDir, `${options.name}-v${options.version}-${timestamp}.html`);
            await fs.writeFile(snapshotPath, code, 'utf-8');

            // Add metadata
            const metadata = `\n<!-- Deployment Snapshot
     Timestamp: ${new Date().toISOString()}
     Source: ${fileName}
     Version: ${options.version}
     Size: ${code.length} characters
     Page ID: ${options.pageId}
-->\n`;
            await fs.appendFile(snapshotPath, metadata, 'utf-8');

            snapshotSpinner.succeed(chalk.green(`✅ Snapshot saved: ${path.basename(snapshotPath)}`));
        } catch (error) {
            snapshotSpinner.warn(chalk.yellow(`⚠️  Could not create snapshot: ${error.message}`));
        }

        // Step 4: Generate deployment URLs
        const realm = process.env.QB_REALM || 'vibe.quickbase.com';
        const appId = process.env.QB_APP_ID || 'bvhuaz7pn';
        const editUrl = `https://${realm}/db/${appId}?a=dbpage&pageID=${options.pageId}&edit=1`;
        const viewUrl = `https://${realm}/db/${appId}?a=dbpage&pageID=${options.pageId}`;

        // Final summary
        console.log(chalk.green.bold('\n✅ Deployment Prepared Successfully!\n'));
        
        console.log(chalk.blue('📋 Deployment Summary:'));
        console.log(chalk.white(`  File: ${fileName}`));
        console.log(chalk.white(`  Name: ${options.name}`));
        console.log(chalk.white(`  Version: ${options.version}`));
        console.log(chalk.white(`  Size: ${code.length.toLocaleString()} characters`));
        console.log(chalk.white(`  Page ID: ${options.pageId}`));
        console.log(chalk.white(`  Realm: ${realm}`));

        console.log(chalk.blue('\n📝 Next Steps:'));
        console.log(chalk.white('  1. Open the codepage editor in your browser'));
        console.log(chalk.white('  2. Press Ctrl+A to select all existing code'));
        console.log(chalk.white('  3. Press Ctrl+V to paste the new code (already in clipboard!)'));
        console.log(chalk.white('  4. Click "Save & Close"'));
        console.log(chalk.white('  5. Test the deployed codepage'));

        console.log(chalk.blue('\n🔗 Quick Links:'));
        console.log(chalk.cyan(`  Edit:  ${editUrl}`));
        console.log(chalk.cyan(`  View:  ${viewUrl}`));

        console.log(chalk.green.bold('\n🎉 Ready to deploy!\n'));

    } catch (error) {
        spinner.fail(chalk.red('Deployment preparation failed'));
        console.error(chalk.red(`\n❌ Error: ${error.message}`));
        if (error.stack) {
            console.error(chalk.gray(error.stack));
        }
        process.exit(1);
    }
}

deploy();
