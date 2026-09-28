import { Injectable, Logger, LoggerService } from '@nestjs/common'
import { appendFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly consoleLogger = new Logger()
  private readonly logDirectory = resolve(process.cwd(), 'logs')

  log(message: unknown, context?: string) {
    this.consoleLogger.log(message, context)
    this.persist('INFO', message, context)
  }

  error(message: unknown, trace?: string, context?: string) {
    this.consoleLogger.error(message, trace, context)
    this.persist('ERROR', message, context, trace)
  }

  warn(message: unknown, context?: string) {
    this.consoleLogger.warn(message, context)
    this.persist('WARN', message, context)
  }

  debug(message: unknown, context?: string) {
    this.consoleLogger.debug(message, context)
    this.persist('DEBUG', message, context)
  }

  verbose(message: unknown, context?: string) {
    this.consoleLogger.verbose(message, context)
    this.persist('VERBOSE', message, context)
  }

  fatal(message: unknown, context?: string) {
    this.consoleLogger.fatal(message, context)
    this.persist('FATAL', message, context)
  }

  private persist(level: string, message: unknown, context?: string, trace?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'Application',
      message: this.toText(message),
      ...(trace ? { trace } : {}),
    }

    void mkdir(this.logDirectory, { recursive: true })
      .then(() => appendFile(resolve(this.logDirectory, this.fileName(level)), `${JSON.stringify(entry)}\n`))
      .catch((error: unknown) => {
        this.consoleLogger.error(`No se pudo escribir el log: ${this.toText(error)}`, 'FileLogger')
      })
  }

  private fileName(level: string) {
    return level === 'ERROR' || level === 'FATAL' ? 'errors.log' : 'app.log'
  }

  private toText(value: unknown) {
    if (value instanceof Error) return value.message
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch {
      return '[unserializable log message]'
    }
  }
}
