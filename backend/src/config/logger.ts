import winston from "winston";
import Transport from "winston-transport";
import { trace, context } from "@opentelemetry/api";
import { FluentClient } from "@fluent-org/logger";
import { config } from "./appConfig";

// A custom formatter to add trace and span IDs to logs
const otelFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});

// Создаем кастомный транспорт для Winston, который использует официальный @fluent-org/logger.
// Это обеспечивает надежность и правильную обработку структурированных логов.
class FluentTransport extends Transport {
  private client: FluentClient;

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
    this.client = new FluentClient("payment_service.logs", {
      socket: {
        host: config.fluentBit.host,
        port: config.fluentBit.port,
        timeout: config.fluentBit.timeout,
      },
    });
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // @fluent-org/logger ожидает (label, data, timestamp).
    // Мы используем info.level в качестве label для дополнительной фильтрации
    // и отправляем весь объект info в качестве данных.
    this.client.emit(info.level, info).catch((err) => {
      // Логируем ошибку отправки в консоль, чтобы не потерять ее
      console.error("Fluent-logger failed to send log:", err);
    });

    callback();
  }
}

const transports: winston.transport[] = [new winston.transports.Console()];

// Добавляем транспорт Fluent Bit, если он настроен.
if (config.fluentBit.host) {
  transports.push(new FluentTransport());
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    otelFormat(), // Add OpenTelemetry context
    winston.format.json() // Log in JSON format
  ),
  transports,
});

export default logger;
