import { Semaphore } from 'async-mutex';
import { JSONSchema } from 'json-schema-to-ts';
import { InputItem, ModelChunk, ToolDefinition } from '../type.js';

export type Options = {
  thinking?: { type: 'enabled' | 'disabled' | 'auto' };
  reasoning?: {
    effort: 'minimal' | 'low' | 'medium' | 'high';
  };
  temperature?: number;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
  textSchema?: JSONSchema;
};

export class BaseModel {
  public semaphore: Semaphore;

  constructor(public url: string, public apiKey: string, public model: string, public options?: Options) {
    this.semaphore = new Semaphore(10);
  }

  async *stream(messages: InputItem[], options?: Options): AsyncGenerator<ModelChunk> {
    throw new Error('Method not implemented.');
  }

  async invoke(messages: InputItem[], options?: Omit<Options, 'tools'>): Promise<{ message: string; usage }> {
    throw new Error('Method not implemented.');
  }
}
