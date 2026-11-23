import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { applySecurityMiddleware } from './common/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Exception Filter for user-friendly Spanish errors
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security headers, body limits, and strict CORS allowlist
  applySecurityMiddleware(app);

  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const logger = new Logger('Bootstrap');
  const port = process.env.PORT || 3000;
  logger.log(`Iniciando servidor TesorApp en puerto ${port}...`);
  await app.listen(port);
  logger.log(`TesorApp Backend listo y escuchando en http://localhost:${port}`);
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error fatal durante el inicio de TesorApp:', err);
  process.exit(1);
});
