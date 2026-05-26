import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((error) => Object.values(error.constraints || {}).join(', '))
          .join('; ');
        return new BadRequestException(`Validation failed: ${messages}`);
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const configService = app.get(ConfigService);
  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';
  const cacheTtl = parseInt(configService.get<string>('CACHE_TTL') || '3600', 10);

  await app.listen(port, host);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Network: http://<votre-ip>:${port} (pour accès téléphone)`);
  console.log(`Cache TTL: ${cacheTtl}s`);
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || '*'}`);
}
void bootstrap();
