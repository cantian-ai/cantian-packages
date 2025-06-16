export const normalizeModelSchema = async (options: { schema; deleteFields?: string[] }) => {
  const { schema, deleteFields } = options;
  const newSchema = structuredClone(schema);
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
