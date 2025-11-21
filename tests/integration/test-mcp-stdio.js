#!/usr/bin/env node

// Test the MCP server by sending it a direct request via stdio
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing MCP Server Direct Communication\n');

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
console.log(`Starting server: ${serverPath}\n`);

const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
        ...process.env,
        QB_REALM: 'vibe.quickbase.com',
        QB_USER_TOKEN: 'b3tqay_rwcp_0_bufr55cdre6q9cdneg5bjdwfvaw',
        QB_APP_ID: 'bvhuaz7pn',
        CODEPAGE_TABLE_ID: 'bvi2ms4e9'
    }
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    console.log('📨 Server response:', data.toString());
});

server.stderr.on('data', (data) => {
    console.error('⚠️  Server error:', data.toString());
});

server.on('close', (code) => {
    console.log(`\n✅ Server process exited with code ${code}`);
    process.exit(code);
});

// Send initialize request
setTimeout(() => {
    console.log('📤 Sending initialize request...\n');
    const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        }
    };
    server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

// Send list tools request
setTimeout(() => {
    console.log('📤 Sending tools/list request...\n');
    const listToolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    };
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1500);

// Send deploy codepage request
setTimeout(() => {
    console.log('📤 Sending deploy codepage request...\n');
    const deployRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
            name: 'quickbase_deploy_codepage',
            arguments: {
                tableId: 'bvi2ms4e9',
                name: 'MCP Server Test',
                code: '<html><body><h1>MCP Test</h1></body></html>',
                description: 'Testing MCP server directly',
                version: '1.0.0'
            }
        }
    };
    server.stdin.write(JSON.stringify(deployRequest) + '\n');
}, 2500);

// Close after 5 seconds
setTimeout(() => {
    console.log('\n⏱️  Test complete, closing server...');
    server.kill();
}, 5000);
