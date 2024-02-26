export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    const { registerOtel } = await import('./lib/otel/instrumentation.node');

    registerOtel({
      endpoint: process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
      serviceName: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
      version: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
    });
  }
}
