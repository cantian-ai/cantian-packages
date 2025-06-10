import { BaseController } from 'cantian-rest';
import { globSync, mkdirSync, writeFileSync } from 'fs';

const [, , relativeControllersFolder = 'dist/controllers', OPENAPI_SPEC_PATH = 'tmp/openapi.json'] = process.argv;

const cwd = process.cwd();
const serviceFolderName = cwd.split('/').pop() as string;

const controllerFilePaths = globSync(`${relativeControllersFolder}/**/*.js`);

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
  const { default: defaultClass }: { default: typeof BaseController } = await import(`${cwd}/${controllerFilePath}`);

  const pathParts = controllerFilePath
    .replace(relativeControllersFolder + '/', '')
    .replace(/\.js$/, '')
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
    spec.responses[defaultClass.successStatusCode] = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              errorCode: { type: 'number' },
              data: resultSchema,
            },
            required: ['data', 'errorCode'],
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

console.log(specs);

mkdirSync('tmp', { recursive: true });
writeFileSync(OPENAPI_SPEC_PATH, JSON.stringify(specs, null, 2));
