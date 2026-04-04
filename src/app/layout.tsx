import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { context, propagation } from "@opentelemetry/api";

import { Nav } from '@/components/nav';
import { Otel } from '@/components/otel';

import './globals.css';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nextjs OpenTelemetry sample app',
  description: 'Configures OpenTelemetry SDK to send traces for Nextjs applications',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Inject the server's current span into a carrier so the browser's document-load
  // instrumentation can read it from the <meta name="traceparent"> tag and attach
  // the client-side page load as a child of this server request span.
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  const {
    BUILD: version,
    OTEL_SERVICE_NAME: serviceName,
    OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
  } = process.env;

  return (
    <html lang="en">
      <head>
        {carrier['traceparent'] && (
          <meta name="traceparent" content={carrier['traceparent']} />
        )}
      </head>
      <body className={inter.className}>
        <Nav />
        <main className="p-5">{children}</main>
        <Otel
          endpoint={endpoint!}
          serviceName={serviceName!}
          version={version!}
        />
      </body>
    </html>
  );
}
