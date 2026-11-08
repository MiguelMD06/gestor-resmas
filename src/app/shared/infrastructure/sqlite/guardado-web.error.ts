export class GuardadoWebError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'GuardadoWebError';
  }
}
