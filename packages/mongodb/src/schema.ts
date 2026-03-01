import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export type MongoBsonType = 'date' | 'objectId' | 'string' | 'int' | 'long' | 'double' | 'bool';

export type MongoJSONSchema = JSONSchema & {
  bsonType?: MongoBsonType | readonly MongoBsonType[];
  properties?: Readonly<Record<string, MongoJSONSchema>>;
};

type BsonTypeToTs<T> =
  T extends 'date' ? Date :
  T extends 'objectId' ? string :
  T extends 'string' ? string :
  T extends 'int' | 'long' | 'double' ? number :
  T extends 'bool' ? boolean :
  unknown;

type ExtractBson<T> =
  T extends readonly (infer U)[] ? BsonTypeToTs<U> : BsonTypeToTs<T>;

export type FromMongoSchema<S extends MongoJSONSchema> =
  // If schema itself declares bsonType
  S extends { bsonType: infer B }
    ? ExtractBson<B>
    // If object with properties, map each property and support bsonType inside
    : S extends {
        type: 'object';
        properties: infer P;
        required?: readonly (infer R)[];
      }
      ? (
          // required fields
          {
            [K in Extract<R, keyof P>]:
              P[K] extends MongoJSONSchema ? FromMongoSchema<P[K]> : never;
          } &
          // optional fields
          {
            [K in Exclude<keyof P, Extract<R, keyof P>>]?:
              P[K] extends MongoJSONSchema ? FromMongoSchema<P[K]> : never;
          }
        )
      // Fallback to standard json-schema-to-ts behavior
      : FromSchema<S>;
