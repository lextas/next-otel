export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_BUILD: string;
      NEXT_PUBLIC_OTEL_SERVICE_NAME: string;
      NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT: string;
      NEXT_PUBLIC_OTEL_CONSOLE_LOG: string;
    }
  }
}
