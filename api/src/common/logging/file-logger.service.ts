import { Injectable, LoggerService } from "@nestjs/common";
import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logDirectory = resolve(process.cwd(), "logs");

  log(message: unknown, context?: string) {
    console.log(this.formatConsoleMessage("INFO", message, context));
    this.persist("INFO", message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    console.error(this.formatConsoleMessage("ERROR", message, context, trace));
    this.persist("ERROR", message, context, trace);
  }

  warn(message: unknown, context?: string) {
    console.warn(this.formatConsoleMessage("WARN", message, context));
    this.persist("WARN", message, context);
  }

  debug(message: unknown, context?: string) {
    console.debug(this.formatConsoleMessage("DEBUG", message, context));
    this.persist("DEBUG", message, context);
  }

  verbose(message: unknown, context?: string) {
    console.info(this.formatConsoleMessage("VERBOSE", message, context));
    this.persist("VERBOSE", message, context);
  }

  fatal(message: unknown, context?: string) {
    console.error(this.formatConsoleMessage("FATAL", message, context));
    this.persist("FATAL", message, context);
  }

  private persist(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? "Application",
      message: this.toText(message),
      ...(trace ? { trace } : {}),
    };

    void mkdir(this.logDirectory, { recursive: true })
      .then(() =>
        appendFile(
          resolve(this.logDirectory, this.fileName(level)),
          `${JSON.stringify(entry)}\n`,
        ),
      )
      .catch((error: unknown) => {
        console.error(
          this.formatConsoleMessage(
            "ERROR",
            `No se pudo escribir el log: ${this.toText(error)}`,
            "FileLogger",
          ),
        );
      });
  }

  private formatConsoleMessage(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const prefix = context ? `[${context}]` : "[Application]";
    const payload = trace
      ? `${this.toText(message)}\n${trace}`
      : this.toText(message);
    return `[${level}] ${prefix} ${payload}`;
  }

  private fileName(level: string) {
    return level === "ERROR" || level === "FATAL" ? "errors.log" : "app.log";
  }

  private toText(value: unknown) {
    if (value instanceof Error) return value.message;
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return "[unserializable log message]";
    }
  }
}
