import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

export const initTracing = () => {
  const traceExporter = new OTLPTraceExporter({
    // URL for Tempo in your docker-compose
    url: "grpc://tempo:4317",
  });

  const metricExporter = new OTLPMetricExporter({
    // URL for Tempo/collector in your docker-compose
    url: "grpc://tempo:4317",
  });

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "payment-service-backend",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000, // Export metrics every 10 seconds
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable instrumentations that are not needed
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
      new WinstonInstrumentation({
        logHook: (span, record) => {
          record["resource.service.name"] =
            resource.attributes[SemanticResourceAttributes.SERVICE_NAME];
        },
      }),
    ],
  });

  try {
    sdk.start();
    console.log("OpenTelemetry Tracing initialized");

    process.on("SIGTERM", () => {
      sdk
        .shutdown()
        .then(() => console.log("Tracing terminated"))
        .catch((error) => console.log("Error terminating tracing", error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.log("Error initializing tracing", error);
  }
};
