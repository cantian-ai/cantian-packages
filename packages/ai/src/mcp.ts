import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from './type.js';

export const createMcpClient = async (options: { url: string; authorization: string }) => {
  const { url, authorization } = options;
  const client = new Client({
    version: '1.0.0',
    name: 'cantian-ai',
  });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${authorization}`,
      },
    },
  });
  await client.connect(transport);
  return client;
};

export const listTools = async (client: Client) => {
  const response = await client.request(
    {
      method: 'tools/list',
      params: {},
    },
    ListToolsResultSchema,
  );
  return response;
};

export const callTool = async (client: Client, name: string, args: any) => {
  const response = await client.request(
    {
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    },
    CallToolResultSchema,
  );
  return response;
};

export const listAgentTools = async (options: { url: string; authorization: string }) => {
  const client = await createMcpClient(options);
  const response = await listTools(client);
  await client.transport?.close();
  await client.close();
  const tools: Tool[] = response.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
    async handler(args, context) {
      const client = await createMcpClient(options);
      const response = await callTool(client, t.name, args);
      await client.transport?.close();
      await client.close();
      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }
      return response.content;
    },
  }));
  return tools;
};
