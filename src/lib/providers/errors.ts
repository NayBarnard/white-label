export class ProviderNotConfiguredError extends Error {
  constructor() {
    super("Provider not configured");
    this.name = "ProviderNotConfiguredError";
  }
}
