import { JSONSchema } from 'json-schema-to-ts';

export const modelSchemaToApiSchema = (options: { modelSchema; deleteFields?: string[] }) => {
  const { modelSchema, deleteFields } = options;
  const newSchema = structuredClone(modelSchema);
  if (newSchema.properties) {
    if (newSchema.properties._id) {
      newSchema.properties.id = newSchema.properties._id;
      delete newSchema.properties._id;
    }
    if (deleteFields?.length) {
      for (let deleteField of deleteFields) {
        delete newSchema.properties[deleteField];
      }
    }
  }
  return newSchema;
};

export const modelToApiObject = (options: { model; deleteFields?: string[] }) => {
  const model = structuredClone(options.model);
  if (options.deleteFields?.length) {
    for (let deleteField of options.deleteFields) {
      delete model[deleteField];
    }
  }
  if (model._id) {
    model.id = model._id;
    delete model._id;
  }
  return model;
};

export const modelsToApiObjects = (options: { models; deleteFields?: string[] }) => {
  const results: any[] = [];
  for (const model of options.models) {
    results.push(modelToApiObject(model));
  }
  return results;
};

export const buildSearchReulstSchema = (options: { modelSchema; deleteFields?: string[] }) => {
  return {
    type: 'object',
    properties: {
      results: { type: 'array', items: modelSchemaToApiSchema(options) },
    },
    required: ['results'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
};
