export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} with id '${id}' not found`, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(422, "Validation failed", "VALIDATION_ERROR", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export class UpstreamServiceError extends AppError {
  constructor(service: string, reason: string) {
    super(503, `${service} is unavailable: ${reason}`, "UPSTREAM_UNAVAILABLE");
  }
}

export class BadGatewayError extends AppError {
  constructor(service: string, reason: string) {
    super(502, `Invalid response from ${service}: ${reason}`, "BAD_GATEWAY");
  }
}
