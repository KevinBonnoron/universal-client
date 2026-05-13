export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body: unknown;

  constructor(message: string, status: number, statusText: string, headers: Headers, body: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.body = body;
  }
}
