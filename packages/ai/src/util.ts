import { Tool, ToolCallChunk } from './type.js';

export const executeTool = async (
  toolCall: ToolCallChunk,
  tools: Record<string, Tool>,
  context: any,
): Promise<{ error?: any; result?: any; aiText?: string }> => {
  const tool = tools[toolCall.name];
  if (!tool) {
    return { error: new Error('The tool name does not exist.') };
  }
  let json: Object;
  try {
    json = JSON.parse(toolCall.arguments);
  } catch (error) {
    return { error: new Error('The given <arguments> is an invalid JSON string.') };
  }

  try {
    if (tool.validate) {
      const valid = tool.validate(json);
      if (!valid) {
        return { error: new Error(`Invalid arguments: ${tool.validate.errors?.[0].message}`) };
      }
    }
    const handlerResult = tool.handler(json, context);
    const isAsyncGen = isAsyncGenerator(handlerResult);
    if (isAsyncGen) {
      return { result: handlerResult };
    }
    const result = await handlerResult;
    const aiText = tool.toAiText ? await tool.toAiText(result, context, json) : undefined;
    return { result, aiText };
  } catch (error) {
    return { error };
  }
};

export function isAsyncGenerator(value) {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}
