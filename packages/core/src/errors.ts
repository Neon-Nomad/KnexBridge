export class IntrospectionError extends Error {
  constructor(
    message: string,
    public details?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'IntrospectionError';
    Object.setPrototypeOf(this, IntrospectionError.prototype);
  }
}

export class GenerationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GenerationError';
    Object.setPrototypeOf(this, GenerationError.prototype);
  }
}