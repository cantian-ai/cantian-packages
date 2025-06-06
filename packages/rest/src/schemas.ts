import { FromSchema, JSONSchema } from 'json-schema-to-ts';

export const resultTrueSchema = {
  type: 'object',
  properties: {
    result: { type: 'boolean' },
  },
  additionalProperties: false,
  required: ['result'],
} as const satisfies JSONSchema;

export type ResultTrue = FromSchema<typeof resultTrueSchema>;
