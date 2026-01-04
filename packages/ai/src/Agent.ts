import Ajv, { ValidateFunction } from 'ajv';
import { BaseModel } from './models/BaseModel.js';
import { AgentChunk, InputItem, ToolCallChunk, ToolCallingChunk, ToolCallOutputChunk, ToolDefinition } from './type.js';

export type StreamController = { stop?: boolean };

export type AgentTool = ToolDefinition & {
  handler: (args, context, controller: StreamController) => any;
};

const ajv = new Ajv.default({ removeAdditional: true, useDefaults: true });

const DEFAULT_MAX_ROUNDS = 5;

export class Agent {
  public toolMap: Record<string, AgentTool & { validate: ValidateFunction }> = {};
  public model: BaseModel;

  constructor(options: { model: BaseModel; tools: AgentTool[] }) {
    this.model = options.model;
    for (const tool of options.tools) {
      this.toolMap[tool.name] = {
        ...tool,
        validate: ajv.compile(tool.parameters),
      };
    }
  }

  async *stream(
    messages: any[],
    options?: { signal?: AbortSignal; maxRounds?: number; context?: any },
  ): AsyncGenerator<AgentChunk> {
    const input: InputItem[] = [...messages];
    let round = 0;
    let toolCalls: ToolCallChunk[];
    const controller: StreamController = {};
    const toolDefinitions = Object.values(this.toolMap).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
    do {
      const response = this.model.stream(input, {
        tools: round < DEFAULT_MAX_ROUNDS - 1 ? toolDefinitions : undefined,
        signal: options?.signal,
      });
      toolCalls = [];
      for await (const chunk of response) {
        switch (chunk.type) {
          case 'TOKEN':
          case 'MESSAGE':
          case 'USAGE':
          case 'MODEL_CALLING':
            yield chunk;
            break;
          case 'TOOL_CALL':
            toolCalls.push(chunk);
            input.push(chunk);
            yield chunk;
            break;
          default:
            break;
        }
      }
      if (toolCalls.length) {
        for (const toolCall of toolCalls) {
          yield { ...toolCall, type: 'TOOL_CALLING' } satisfies ToolCallingChunk;
          const { error, result } = await this.executeTool(toolCall, options?.context, controller);
          const toolCallOutputChunk: ToolCallOutputChunk = {
            type: 'TOOL_CALL_OUTPUT',
            name: toolCall.name,
            callId: toolCall.callId,
            error,
            result,
          };
          input.push(toolCallOutputChunk);
          yield toolCallOutputChunk;
        }
      }
      round++;
    } while (toolCalls.length && round < (options?.maxRounds || DEFAULT_MAX_ROUNDS) && !controller.stop);
  }

  async executeTool(
    toolCall: ToolCallChunk,
    context: any,
    controller: StreamController,
  ): Promise<{ error?: any; result?: any }> {
    const tool = this.toolMap[toolCall.name];
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
      const valid = tool.validate(json);
      if (!valid) {
        return { error: new Error(`Invalid arguments: ${tool.validate.errors?.[0].message}`) };
      }
      const result = await tool.handler(json, context, controller);
      return { result };
    } catch (error) {
      return { error };
    }
  }
}
