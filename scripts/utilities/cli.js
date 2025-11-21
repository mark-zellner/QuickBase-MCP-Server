#!/usr/bin/env node
/**
 * QuickBase Codepage CLI Tool
 * Deploy, validate, and manage QuickBase codepages from the command line
 */

import { program } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import https from 'node:https';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';

dotenv.config();

// QuickBase API Client
class QuickBaseAPI {
  constructor(realm, userToken, appId) {
    this.baseURL = 'https://api.quickbase.com/v1';
    this.realm = realm;
    this.appId = appId;
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'QB-Realm-Hostname': realm,
        'Authorization': `QB-USER-TOKEN ${userToken}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
  }

  async deployCodepage(tableId, data) {
    const response = await this.axios.post('/records', {
      to: tableId,
      data: [data]
    });
    return response.data.data?.[0]?.['3']?.value || response.data.metadata?.createdRecordIds?.[0];
  }

  async getCodepage(tableId, recordId) {
    const response = await this.axios.post('/records/query', {
      from: tableId,
      where: `{3.EX.'${recordId}'}`,
      select: [3, 6, 7, 8, 9, 10, 11, 12, 13]
    });
    return response.data.data?.[0];
  }

  async searchCodepages(tableId, searchTerm) {
    const response = await this.axios.post('/records/query', {
      from: tableId,
      where: `{6.CT.'${searchTerm}'}OR{8.CT.'${searchTerm}'}`,
      select: [3, 6, 8, 9, 10, 12, 13],
      top: 50
    });
    return response.data.data || [];
  }

  async updateCodepage(tableId, recordId, updates) {
    await this.axios.post('/records', {
      to: tableId,
      data: [{
        '3': { value: recordId },
        ...updates
      }]
    });
  }

  async validateCodepage(code) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Extract JavaScript from HTML if needed
    let jsCode = code;
    if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) {
      const scriptMatches = code.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      jsCode = Array.from(scriptMatches).map(match => match[1]).join('\n');
    }

    // Syntax check (skip if no JS code found)
    if (jsCode.trim()) {
      try {
        new Function(jsCode);
      } catch (error) {
        // Only report if it's not just HTML
        if (!code.includes('<!DOCTYPE')) {
          results.valid = false;
          results.errors.push(`Syntax Error: ${error.message}`);
        }
      }
    }

    // Security checks on full code
    const securityChecks = [
      { pattern: /eval\(/g, message: 'Uses eval() - potential security risk', level: 'error' },
      { pattern: /innerHTML\s*=/g, message: 'Uses innerHTML - consider textContent or sanitize', level: 'warning' },
      { pattern: /QB-USER-TOKEN|userToken/gi, message: 'Contains hardcoded token - use session auth', level: 'error' }
    ];

    for (const { pattern, message, level } of securityChecks) {
      if (pattern.test(code)) {
        if (level === 'error') {
          results.errors.push(`Security: ${message}`);
          results.valid = false;
        } else {
          results.warnings.push(`Security: ${message}`);
        }
      }
    }

    // API recommendations
    if (/qdb\.api/g.test(code)) results.suggestions.push('✅ Uses qdb.api (good!)');
    if (/qbClient|QB\.api/g.test(code)) results.suggestions.push('✅ Uses QuickBase client');
    if (/fetch\(/g.test(code) && !/qdb\.api/g.test(code)) {
      results.warnings.push('⚠️  Uses fetch without qdb.api - may have CORS issues');
    }

    // Check for test connection features
    if (/test.*connection/gi.test(code)) results.suggestions.push('✅ Includes connection testing');

    return results;
  }
}

// Initialize API client
function initAPI() {
  const realm = process.env.QB_REALM;
  const token = process.env.QB_USER_TOKEN;
  const appId = process.env.QB_APP_ID;

  if (!realm || !token || !appId) {
    console.error(chalk.red('❌ Missing configuration. Please set:'));
    console.error('  - QB_REALM');
    console.error('  - QB_USER_TOKEN');
    console.error('  - QB_APP_ID');
    process.exit(1);
  }

  return new QuickBaseAPI(realm, token, appId);
}

// Deploy command
program
  .command('deploy <file>')
  .description('Deploy a codepage to QuickBase')
  .option('-n, --name <name>', 'Codepage name')
  .option('-d, --description <desc>', 'Codepage description')
  .option('-v, --version <version>', 'Version number')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--target-table <id>', 'Target table ID')
  .option('--table <id>', 'Codepage table ID', process.env.CODEPAGE_TABLE_ID || 'bltcpt7da')
  .option('--validate', 'Validate before deploying', true)
  .action(async (file, options) => {
    const spinner = ora('Reading codepage file...').start();

    try {
      // Read file
      const filePath = path.resolve(file);
      const code = await fs.readFile(filePath, 'utf-8');
      spinner.succeed(`File read: ${chalk.blue(filePath)}`);

      // Validate if requested
      if (options.validate) {
        spinner.start('Validating code...');
        const api = initAPI();
        const validation = await api.validateCodepage(code);

        if (!validation.valid) {
          spinner.fail('Validation failed');
          console.log(chalk.red('\n❌ Errors:'));
          for (const error of validation.errors) {
            console.log(chalk.red(`   • ${error}`));
          }
          process.exit(1);
        }

        if (validation.warnings.length > 0) {
          spinner.warn('Validation passed with warnings');
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          for (const warning of validation.warnings) {
            console.log(chalk.yellow(`   • ${warning}`));
          }
        } else {
          spinner.succeed('Validation passed');
        }

        if (validation.suggestions.length > 0) {
          console.log(chalk.green('\n💡 Suggestions:'));
          for (const suggestion of validation.suggestions) {
            console.log(chalk.green(`   • ${suggestion}`));
          }
        }
      }

      // Deploy
      spinner.start('Deploying to QuickBase...');
      const api = initAPI();

      const recordData = {
        '6': { value: options.name || path.basename(file, path.extname(file)) },
        '7': { value: code }
      };

      if (options.description) recordData['8'] = { value: options.description };
      if (options.version) recordData['9'] = { value: options.version };
      if (options.tags) recordData['10'] = { value: options.tags };
      if (options.targetTable) recordData['12'] = { value: options.targetTable };

      const recordId = await api.deployCodepage(options.table, recordData);

      spinner.succeed(chalk.green(`✅ Deployed successfully!`));
      console.log(chalk.blue(`\n   Record ID: ${recordId}`));
      console.log(chalk.blue(`   Name: ${options.name || path.basename(file, path.extname(file))}`));
      if (options.version) console.log(chalk.blue(`   Version: ${options.version}`));

    } catch (error) {
      spinner.fail(chalk.red('Deployment failed'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <file>')
  .description('Validate a codepage without deploying')
  .action(async (file) => {
    const spinner = ora('Reading and validating codepage...').start();

    try {
      const code = await fs.readFile(path.resolve(file), 'utf-8');
      const api = initAPI();
      const validation = await api.validateCodepage(code);

      if (validation.valid) {
        spinner.succeed(chalk.green('✅ Validation passed!'));
      } else {
        spinner.fail(chalk.red('❌ Validation failed'));
      }

      if (validation.errors.length > 0) {
        console.log(chalk.red('\n❌ Errors:'));
        for (const error of validation.errors) {
          console.log(chalk.red(`   • ${error}`));
        }
      }

      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`   • ${warning}`));
        }
      }

      if (validation.suggestions.length > 0) {
        console.log(chalk.green('\n💡 Suggestions:'));
        for (const suggestion of validation.suggestions) {
          console.log(chalk.green(`   • ${suggestion}`));
        }
      }

      process.exit(validation.valid ? 0 : 1);

    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Search command
program
  .command('search <term>')
  .description('Search for codepages')
  .option('--table <id>', 'Codepage table ID', process.env.CODEPAGE_TABLE_ID || 'bltcpt7da')
  .action(async (term, options) => {
    const spinner = ora('Searching codepages...').start();

    try {
      const api = initAPI();
      const results = await api.searchCodepages(options.table, term);

      if (results.length === 0) {
        spinner.info(`No codepages found matching "${term}"`);
        return;
      }

      spinner.succeed(`Found ${results.length} codepage(s)`);

      console.log('');
      for (const record of results) {
        console.log(chalk.blue(`📄 ${record['6']?.value || 'Untitled'}`));
        console.log(`   ID: ${record['3']?.value}`);
        if (record['8']?.value) console.log(`   Description: ${record['8']?.value}`);
        if (record['9']?.value) console.log(`   Version: ${record['9']?.value}`);
        if (record['10']?.value) console.log(`   Tags: ${record['10']?.value}`);
        if (record['12']?.value) console.log(`   Target Table: ${record['12']?.value}`);
        console.log(`   Active: ${record['13']?.value ? '✅' : '❌'}`);
        console.log('');
      }

    } catch (error) {
      spinner.fail(chalk.red('Search failed'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Get command
program
  .command('get <recordId>')
  .description('Get a specific codepage')
  .option('--table <id>', 'Codepage table ID', process.env.CODEPAGE_TABLE_ID || 'bltcpt7da')
  .option('-o, --output <file>', 'Output file path')
  .action(async (recordId, options) => {
    const spinner = ora('Fetching codepage...').start();

    try {
      const api = initAPI();
      const record = await api.getCodepage(options.table, recordId);

      if (!record) {
        spinner.fail(`Codepage ${recordId} not found`);
        process.exit(1);
      }

      spinner.succeed('Codepage retrieved');

      const name = record['6']?.value || 'Untitled';
      const code = record['7']?.value || '';

      console.log(chalk.blue(`\n📄 ${name}`));
      console.log(`   ID: ${recordId}`);
      if (record['8']?.value) console.log(`   Description: ${record['8']?.value}`);
      if (record['9']?.value) console.log(`   Version: ${record['9']?.value}`);
      if (record['10']?.value) console.log(`   Tags: ${record['10']?.value}`);

      if (options.output) {
        await fs.writeFile(options.output, code, 'utf-8');
        console.log(chalk.green(`\n✅ Saved to: ${options.output}`));
      } else {
        console.log(chalk.gray(`\n   Code length: ${code.length} characters`));
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to get codepage'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Update command
program
  .command('update <recordId>')
  .description('Update an existing codepage')
  .option('-f, --file <file>', 'New code file')
  .option('-d, --description <desc>', 'New description')
  .option('-v, --version <version>', 'New version')
  .option('--table <id>', 'Codepage table ID', process.env.CODEPAGE_TABLE_ID || 'bltcpt7da')
  .action(async (recordId, options) => {
    const spinner = ora('Updating codepage...').start();

    try {
      const api = initAPI();
      const updates = {};

      if (options.file) {
        const code = await fs.readFile(path.resolve(options.file), 'utf-8');
        updates['7'] = { value: code };
      }

      if (options.description) updates['8'] = { value: options.description };
      if (options.version) updates['9'] = { value: options.version };

      if (Object.keys(updates).length === 0) {
        spinner.fail('No updates specified');
        console.log(chalk.yellow('\nUse --file, --description, or --version'));
        process.exit(1);
      }

      await api.updateCodepage(options.table, recordId, updates);

      spinner.succeed(chalk.green(`✅ Codepage ${recordId} updated successfully!`));

    } catch (error) {
      spinner.fail(chalk.red('Update failed'));
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Configure program
program
  .name('qb-codepage')
  .description('QuickBase Codepage CLI Tool')
  .version('1.0.0');

program.parse();
