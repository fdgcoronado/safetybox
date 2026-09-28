import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { FileLoggerService } from './common/logging/file-logger.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const fileLogger = app.get(FileLoggerService)
  app.useLogger(fileLogger)
  app.enableCors()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter(fileLogger))
  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
