import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  const port = Number(process.env.PORT) || 3002;
  await app.listen(port, '0.0.0.0');
  Logger.log(`space-service escuchando en el puerto ${port}`, 'Bootstrap');
}

void bootstrap();
