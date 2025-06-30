import { Collection } from 'cantian-mongodb';

// Make all fields of T optional and allow null values.
export type PartialWithNull<T> = {
  [K in keyof T]?: T[K] | null;
};

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
    results.push(modelToApiObject({ model, deleteFields: options.deleteFields }));
  }
  return results;
};

/**
 * Build mongodb update operation. Return example: `{$set: {key: 1}, $unset: {key: 1}}`.
 */
export function buildUpdateOperations(data: Record<string, any>) {
  const setFields: Record<string, any> = {};
  const unsetFields: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      unsetFields[key] = 1;
    } else if (value !== undefined) {
      setFields[key] = value;
    }
  }

  const updateOperations: any = {};
  if (Object.keys(setFields).length) {
    updateOperations.$set = setFields;
  }
  if (Object.keys(unsetFields).length) {
    updateOperations.$unset = unsetFields;
  }
  return updateOperations;
}

/**
 * Update model and return the new one. Will update the field `updatedAt` automatically if it does not present.
 */
export async function patchModel<T extends { updatedAt: string; [key: string]: any }>(
  collection: Collection<T>,
  id: string,
  data: PartialWithNull<T>,
) {
  const updateData = { ...data };
  if (!data.updatedAt) {
    const now = new Date().toISOString();
    updateData.updatedAt = now;
  }

  const updateOperations = buildUpdateOperations(updateData);
  const result = await collection.findOneAndUpdate({ _id: id } as any, updateOperations, { returnDocument: 'after' });
  return result;
}
