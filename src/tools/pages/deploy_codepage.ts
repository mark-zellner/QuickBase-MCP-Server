import { z } from 'zod';
import axios from 'axios';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { QuickBaseConfig } from '../../types/quickbase.js';

export const DeployCodepageSchema = z.object({
  appId: z.string().optional().describe("Target app DBID (defaults to QB_APP_ID)"),
  pageName: z.string().describe("Name with extension, e.g. index.html"),
  pageType: z.union([z.literal(1), z.literal(3)]).default(1).describe("1=HTML/Text, 3=Exact Form"),
  sourcePath: z.string().describe("Workspace-relative path to local file to deploy"),
  overwriteById: z.number().optional().describe("Optional pageId to replace; use when renaming")
});

export async function deployCodepage(args: z.infer<typeof DeployCodepageSchema>, config: QuickBaseConfig) {
  const appId = args.appId || config.appId;
  const filePath = path.resolve(process.cwd(), args.sourcePath);
  
  let fileContents: string;
  try {
    fileContents = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file at ${args.sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const xmlBody = `
<qdbapi>
  <usertoken>${config.userToken}</usertoken>
  <pagetype>${args.pageType}</pagetype>
  ${args.overwriteById ? `<pageid>${args.overwriteById}</pageid>` : `<pagename>${args.pageName}</pagename>`}
  <pagebody><![CDATA[${fileContents}]]></pagebody>
</qdbapi>`;

  const url = `https://${config.realm}/db/${appId}?a=API_AddReplaceDBPage`;

  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  try {
    const response = await axios.post(url, xmlBody, {
      headers: {
        'Content-Type': 'application/xml',
        'QB-Realm-Hostname': config.realm,
        'User-Agent': 'QuickBase-MCP-Server/1.0.0'
      },
      timeout: config.timeout,
      httpsAgent: agent
    });

    const responseData = response.data;
    
    // Simple XML parsing to check for error
    if (responseData.includes('<errcode>0</errcode>')) {
        // Extract page ID if possible
        const pageIdMatch = responseData.match(/<pageID>(\d+)<\/pageID>/);
        const pageId = pageIdMatch ? parseInt(pageIdMatch[1]) : undefined;
        
        return {
            status: "ok",
            pageName: args.pageName,
            appId,
            pageId
        };
    } else {
        const errCodeMatch = responseData.match(/<errcode>(.*?)<\/errcode>/);
        const errTextMatch = responseData.match(/<errtext>(.*?)<\/errtext>/);
        const errDetailMatch = responseData.match(/<errdetail>(.*?)<\/errdetail>/);
        
        throw new Error(`QuickBase API Error: Code ${errCodeMatch?.[1]} - ${errTextMatch?.[1]}${errDetailMatch ? ` (${errDetailMatch[1]})` : ''}`);
    }

  } catch (error) {
     if (axios.isAxiosError(error)) {
        throw new Error(`HTTP Error: ${error.response?.status} ${error.response?.statusText} - ${error.message}`);
     }
     throw error;
  }
}
