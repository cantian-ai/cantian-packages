import { BaseController } from 'cantian-rest';
import { globSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'node:path';

const OPENAPI_SPEC_PATH = 'tmp/openapi.json';
const absoluteControllersFolder = resolve(process.cwd(), process.env.CONTROLLER_DIR || 'dist/controllers');
const cwd = process.cwd();
const serviceFolderName = process.env.SERVICE_NAME || (cwd.split('/').pop() as string);

const controllerFilePaths = globSync(`${absoluteControllersFolder}/**/*.{js,ts}`);

type EndPointObject = {
  tags: string[];
  summary: string;
  description: string;
  responses: Object;
  parameters?: Object[];
  requestBody?: Object;
};

const specs: Record<string, Record<string, EndPointObject>> = {};
for (const controllerFilePath of controllerFilePaths) {
  if (controllerFilePath.endsWith('.d.ts')) {
    continue;
  }
  const { default: defaultClass }: { default: typeof BaseController } = await import(controllerFilePath);

  const pathParts = controllerFilePath
    .replace(absoluteControllersFolder + '/', '')
    .replace(/\.(js|ts)$/i, '')
    .split('/');
  const method = pathParts.pop() as string;
  const apiPath = '/' + pathParts.join('/');

  const spec: EndPointObject = {
    tags: [serviceFolderName],
    summary: defaultClass.summary || `${method.toUpperCase()} ${apiPath}`,
    description: defaultClass.description,
    responses: {},
  };

  if (defaultClass.scope) {
    spec.tags.push(defaultClass.scope);
  }

  if (defaultClass.isPublic) {
    spec.tags.push('PUBLIC');
  }

  const resultSchema = await defaultClass.resultSchema();
  if (resultSchema) {
    spec.responses[200] = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: resultSchema,
            },
            required: ['data', 'code'],
            additionalProperties: false,
          },
        },
      },
    };
  }

  const bodySchema = await defaultClass.dataSchema();
  if (bodySchema) {
    spec.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: bodySchema,
        },
      },
    };
  }

  const pathParams = controllerFilePath.match(/{[^}]*}/g);
  if (pathParams?.length) {
    spec.parameters = [];
    for (const pathParam of pathParams) {
      spec.parameters.push({
        in: 'path',
        name: pathParam.substring(1, pathParam.length - 1),
        require: true,
        schema: {
          type: 'string',
        },
      });
    }
  }

  specs[apiPath] = specs[apiPath] || {};
  specs[apiPath][method] = spec;
}

mkdirSync('tmp', { recursive: true });
writeFileSync(OPENAPI_SPEC_PATH, JSON.stringify(specs, null, 2));

process.exit();
