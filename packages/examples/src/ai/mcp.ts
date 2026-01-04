import { callTool, createMcpClient, listTools } from 'cantian-ai';

(async () => {
  try {
    const url = 'https://openapi-dev.cantian.ai/mcp?tools=Get_bazi_from_solar,Get_bazi_from_lunar';
    const client = await createMcpClient({ url, authorization: process.env.API_KEY_INTERNAL! });
    const result = await listTools(client);
    console.log(result);

    const callResult = await callTool(client, 'Get_bazi_from_solar', {
      year: 2000,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      location: '',
      nickname: '',
      includeNow: false,
      includeImage: false,
      includeLink: false,
      locale: 'zh',
      gender: 1,
      sect: 1,
    });
    console.log(callResult);
  } catch (error) {
    console.error(error);
  }
})();
