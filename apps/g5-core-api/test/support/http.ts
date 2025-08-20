import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Return the inferred agent type directly
export function http(app: INestApplication) {
  // supertest type expects a Node server; Nest returns a compatible object
  return request(app.getHttpServer());
}
