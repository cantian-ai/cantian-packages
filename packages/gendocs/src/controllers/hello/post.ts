import { BaseController, resultTrueSchema } from 'cantian-rest';
import { JSONSchema } from 'json-schema-to-ts';

const dataSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
} as const satisfies JSONSchema;

export default class extends BaseController {
  static isPublic?: boolean | undefined = true;
  static summary: string = 'Hello';
  static description: string = '# xxxxxx\n\nabcdefg\n\n- gogogo';
  static dataSchema(): JSONSchema | undefined {
    return dataSchema;
  }
  static resultSchema() {
    return resultTrueSchema;
  }
  async run() {
    return { result: true };
  }
}
