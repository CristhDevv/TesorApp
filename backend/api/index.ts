import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';

let AppModule: any;
try {
  AppModule = require('../src/app.module').AppModule;
} catch {
  AppModule = require('../app.module').AppModule;
}

let AllExceptionsFilter: any;
try {
  AllExceptionsFilter = require('../src/common/all-exceptions.filter').AllExceptionsFilter;
} catch {
  AllExceptionsFilter = require('../common/all-exceptions.filter').AllExceptionsFilter;
}

const server = express();
let isInitialized = false;

async function bootstrapServer(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
}

export default async function handler(req: Request, res: Response) {
  try {
    if (!isInitialized) {
      await bootstrapServer();
      isInitialized = true;
    }
    server(req, res);
  } catch (err: any) {
    console.error('SERVER BOOTSTRAP ERROR:', err);
    res.status(500).json({
      error: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
