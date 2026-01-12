import { z } from 'zod';
import axios from 'axios';
import { QuickBaseConfig } from '../../types/quickbase.js';

export const GetCodepageSchema = z.object({
  appId: z.string().optional().describe("Target app DBID (defaults to QB_APP_ID)"),
  pageIdOrName: z.string().describe("Page ID (e.g. 7) or name (e.g. index.html)")
});

export async function getCodepage(args: z.infer<typeof GetCodepageSchema>, config: QuickBaseConfig) {
  const appId = args.appId || config.appId;
  const isNumeric = /^\d+$/.test(args.pageIdOrName);
  
  const xmlBody = `
<qdbapi>
  <usertoken>${config.userToken}</usertoken>
  ${isNumeric ? `<pageID>${args.pageIdOrName}</pageID>` : `<pagename>${args.pageIdOrName}</pagename>`}
</qdbapi>`;

  const url = `https://${config.realm}/db/${appId}?a=API_GetDBPage`;

  try {
    const response = await axios.post(url, xmlBody, {
      headers: {
        'Content-Type': 'application/xml',
        'QB-Realm-Hostname': config.realm,
        'User-Agent': 'QuickBase-MCP-Server/1.0.0'
      },
      responseType: 'text', // We expect text/html back usually
      timeout: config.timeout
    });

    const responseData = response.data;

    // Check if it looks like an XML error response
    if (responseData.includes('<qdbapi>') && responseData.includes('<errcode>') && !responseData.includes('<errcode>0</errcode>')) {
        const errCodeMatch = responseData.match(/<errcode>(.*?)<\/errcode>/);
        const errTextMatch = responseData.match(/<errtext>(.*?)<\/errtext>/);
        const errDetailMatch = responseData.match(/<errdetail>(.*?)<\/errdetail>/);
        
        throw new Error(`QuickBase API Error: Code ${errCodeMatch?.[1]} - ${errTextMatch?.[1]}${errDetailMatch ? ` (${errDetailMatch[1]})` : ''}`);
    }

    return {
        status: "ok",
        content: responseData,
        bytes: Buffer.byteLength(responseData, 'utf8')
    };

  } catch (error) {
     if (axios.isAxiosError(error)) {
        throw new Error(`HTTP Error: ${error.response?.status} ${error.response?.statusText} - ${error.message}`);
     }
     throw error;
  }
}
