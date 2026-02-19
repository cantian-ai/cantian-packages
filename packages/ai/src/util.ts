import { InputItem, Tool, ToolCallChunk } from './type.js';

export async function* executeTool(
  toolCall: ToolCallChunk,
  tools: Record<string, Tool>,
  context: any,
): AsyncGenerator<any, { error?: any; result?: any; aiText?: string }> {
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
    let result;

    // generator函数的result是最后yield的结果
    if (isAsyncGenerator(handlerResult)) {
      result = [];
      for await (const chunk of handlerResult) {
        result.push(chunk);
        yield chunk;
      }
    } else {
      result = await handlerResult;
    }
    const aiText = tool.toAiText ? await tool.toAiText(result, context, json) : undefined;
    return { result, aiText };
  } catch (error) {
    return { error };
  }
}

export function isAsyncGenerator(value) {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}

export function filterMessage(message: InputItem) {
  if (!message.type || message.type === 'MESSAGE') {
    return !!message.content;
  }
  return true;
}
