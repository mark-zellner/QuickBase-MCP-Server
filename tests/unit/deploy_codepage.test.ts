import { deployCodepage } from '../../src/tools/pages/deploy_codepage.js';
import axios from 'axios';
import fs from 'fs/promises';
import { jest } from '@jest/globals';

jest.mock('axios');
jest.mock('fs/promises');

describe('deployCodepage', () => {
    const mockConfig = {
        realm: 'mock-realm',
        userToken: 'mock-token',
        appId: 'mock-app-id',
        timeout: 1000,
        maxRetries: 1
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should deploy a new codepage successfully', async () => {
        (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue('<html>content</html>');
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValue({
            data: '<qdbapi><action>API_AddReplaceDBPage</action><errcode>0</errcode><pageID>123</pageID></qdbapi>'
        } as any);

        const result = await deployCodepage({
            pageName: 'index.html',
            sourcePath: 'index.html',
            pageType: 1
        }, mockConfig);

        expect(result.status).toBe('ok');
        expect(result.pageId).toBe(123);
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('API_AddReplaceDBPage'),
            expect.stringContaining('<pagename>index.html</pagename>'),
            expect.any(Object)
        );
    });

    it('should overwrite existing codepage using ID', async () => {
        (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue('<html>content</html>');
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValue({
            data: '<qdbapi><action>API_AddReplaceDBPage</action><errcode>0</errcode><pageID>123</pageID></qdbapi>'
        } as any);

        const result = await deployCodepage({
            pageName: 'index.html',
            sourcePath: 'index.html',
            pageType: 1,
            overwriteById: 123
        }, mockConfig);

        expect(result.status).toBe('ok');
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('API_AddReplaceDBPage'),
            expect.stringContaining('<pageid>123</pageid>'),
            expect.any(Object)
        );
    });

    it('should throw on API error', async () => {
         (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue('<html>content</html>');
         (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValue({
            data: '<qdbapi><errcode>2</errcode><errtext>Error</errtext></qdbapi>'
        } as any);

        await expect(deployCodepage({
            pageName: 'index.html',
            sourcePath: 'index.html',
            pageType: 1
        }, mockConfig)).rejects.toThrow('Code 2 - Error');
    });
});
