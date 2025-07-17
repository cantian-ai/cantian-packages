export type ErrorResponseBody = {
  errorMessage: string;
  errorData?: any;
};

export class RestError {
  constructor(public statusCode: number, public errorMessage: string, public errorData?: any) {}

  static internal(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(500, errorMessage || 'Internal server error.', errorData);
  }

  static notFound(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(404, errorMessage || 'Resource not found.', errorData);
  }

  static badRequest(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(400, errorMessage || 'Bad request.', errorData);
  }

  static forbidden(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(403, errorMessage || 'Forbidden.', errorData);
  }

  static unauthorized(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(401, errorMessage || 'Unauthorized.', errorData);
  }

  static conflict(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(409, errorMessage || 'Conflict.', errorData);
  }

  static tooManyRequests(errorMessage?: string, errorData?: ErrorResponseBody['errorData']) {
    return new RestError(429, errorMessage || 'Too many requests.', errorData);
  }
}
