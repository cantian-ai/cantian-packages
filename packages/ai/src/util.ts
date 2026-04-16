import { Ajv, ValidateFunction } from 'ajv';
import { InputItem, Tool, ToolCallChunk } from './type.js';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateMap = new WeakMap<Tool, ValidateFunction>();

function getToolValidate(tool: Tool) {
  if (tool.validate) return tool.validate;
  const cachedValidate = validateMap.get(tool);
  if (cachedValidate) return cachedValidate;
  const compiledValidate = ajv.compile(tool.parameters);
  validateMap.set(tool, compiledValidate);
  return compiledValidate;
}

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
    const validate = getToolValidate(tool);
    const valid = validate(json);
    if (!valid) {
      const firstError = validate.errors?.[0];
      return {
        error: new Error(`Invalid arguments at "${firstError?.instancePath || '/'}": ${firstError?.message}`),
      };
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

export function toolOutputToAiText(output: any) {
  if (typeof output?.aiText === 'string') {
    return output.aiText;
  }
  if (typeof output !== 'string' && !(output instanceof String)) {
    if (output instanceof Error) {
      output = `Error: ${output.message}`;
    } else {
      output = JSON.stringify(output);
    }
  }
  return output;
}
