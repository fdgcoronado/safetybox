import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FileLoggerService } from "../logging/file-logger.service";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly fileLogger: FileLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const trace = exception instanceof Error ? exception.stack : undefined;

    this.fileLogger.error(
      {
        method: request.method,
        path: request.url,
        status,
        error: exception instanceof Error ? exception.message : exception,
      },
      trace,
      "HttpExceptionFilter",
    );

    response.status(status).json({
      statusCode: status,
      message: this.userMessage(exception, status),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private userMessage(exception: unknown, status: number) {
    if (status >= 500)
      return "Ocurrió un error interno. Intenta de nuevo más tarde.";
    if (!(exception instanceof HttpException))
      return "No se pudo procesar la solicitud.";

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "string") return exceptionResponse;

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      const message = (exceptionResponse as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }

    return "La solicitud no es válida.";
  }
}
