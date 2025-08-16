import { Response } from 'express';
import { RestError } from './RestError.js';

export function openApiPathToExpressPath(path) {
  return path.replace(/\{([a-zA-Z0-9_-]+)\}/g, ':$1');
}

export function sendFlatResponse(error, result, res: Response) {
  let code = 1;
  let data = result;
  let errorMessage: undefined | string = undefined;
  let errorData: undefined | any = undefined;
  if (error) {
    if (error instanceof RestError) {
      code = error.statusCode;
      errorMessage = error.errorMessage;
      errorData = error.errorData;
    } else {
      code = 500;
      data = undefined;
      errorMessage = 'Internal server error.';
      errorData = {};
    }
  }
  res.status(200).json({
    code,
    data,
    errorMessage,
    errorData,
  });
}

export function sendRestResponse(error, result, res: Response, successCode = 200) {
  let code = successCode;
  let data = result;
  let errorMessage: undefined | string = undefined;
  let errorData: undefined | any = undefined;
  if (error) {
    if (error instanceof RestError) {
      code = error.statusCode;
      errorMessage = error.errorMessage;
      errorData = error.errorData;
    } else {
      code = 500;
      data = undefined;
      errorMessage = 'Internal server error.';
      errorData = {};
    }
  }
  res.status(code).json({
    data,
    errorMessage,
    errorData,
  });
}

export const CONTROLLER_DIR = process.cwd() + '/dist/controllers/';
export const INIT_FILE = process.cwd() + '/dist/init.js';
export const REST_BASE_PATH = '/rest';
