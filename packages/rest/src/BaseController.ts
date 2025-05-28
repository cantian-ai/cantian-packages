import Ajv, { ValidateFunction } from 'ajv';
import { JSONSchema } from 'json-schema-to-ts';
import { RestError } from './RestError.js';
import { Auth } from './type.js';

export class BaseController {
  static successStatusCode = 200;

  static dataAjv = new Ajv.default({ removeAdditional: true, useDefaults: true });
  static validateData: ValidateFunction | undefined;

  static resultAjv = new Ajv.default({ removeAdditional: true, useDefaults: true });
  static validateResult: ValidateFunction | undefined;

  static inited: boolean;

  static isPublic: boolean;

  declare ['constructor']: typeof BaseController;

  data?: any;
  auth?: Auth;
  pathParams?: Record<string, string>;

  static init() {
    const dataSchema = this.dataSchema();
    this.validateData = dataSchema ? this.dataAjv.compile(dataSchema) : undefined;

    const resultSchema = this.resultSchema();
    this.validateResult = resultSchema ? this.resultAjv.compile(resultSchema) : undefined;
  }

  constructor(event: { data?: any; auth?: Auth; pathParams?: Record<string, string> }) {
    const constructor = this.constructor as typeof BaseController;
    this.data = event.data;
    this.auth = event.auth;
    this.pathParams = event.pathParams;
    if (!constructor.inited) {
      constructor.init();
    }
  }

  static dataSchema(): JSONSchema | undefined {
    return undefined;
  }

  static resultSchema(): JSONSchema | undefined {
    return undefined;
  }

  static getInvalidProperty(validateFunction: ValidateFunction): string {
    return (
      validateFunction.errors?.[0]?.instancePath?.slice(1) ||
      validateFunction.errors?.[0]?.params?.additionalProperty ||
      validateFunction.errors?.[0]?.params?.missingProperty
    );
  }

  async execute() {
    const constructor = this.constructor as typeof BaseController;

    // Validate data
    if (constructor.validateData && !constructor.validateData(this.data)) {
      throw RestError.badRequest('Invalid request body.', constructor.validateData.errors?.[0]);
    }

    // Run and validate result
    const result = await this.run();
    if (constructor.validateResult) {
      if (!constructor.validateResult(result)) {
        throw RestError.internal('Unexpected result.', constructor.validateResult.errors?.[0]);
      }
    }
    return result;
  }

  async run(): Promise<any> {
    throw RestError.internal('Method not implemented.');
  }
}
