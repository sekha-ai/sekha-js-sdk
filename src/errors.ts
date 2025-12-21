export class SekhaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SekhaError';
  }
}

export class SekhaConnectionError extends SekhaError {
  constructor(message: string) {
    super(message);
    this.name = 'SekhaConnectionError';
  }
}

export class SekhaAuthError extends SekhaError {
  constructor(message: string) {
    super(message);
    this.name = 'SekhaAuthError';
  }
}

export class SekhaValidationError extends SekhaError {
  public readonly details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = 'SekhaValidationError';
    this.details = details;
  }
}

export class SekhaNotFoundError extends SekhaError {
  constructor(message: string) {
    super(message);
    this.name = 'SekhaNotFoundError';
  }
}

export class SekhaAPIError extends SekhaError {
  public readonly statusCode: number;
  public readonly response: string;

  constructor(message: string, statusCode: number, response: string) {
    super(message);
    this.name = 'SekhaAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}
