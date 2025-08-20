import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1709999999000 implements MigrationInterface {
  name = 'InitSchema1709999999000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Minimal tables needed for hardening migration to succeed.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(255) NOT NULL UNIQUE,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      role varchar(20) NOT NULL DEFAULT 'VIEWER',
      status varchar(20) NOT NULL DEFAULT 'ACTIVE',
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      name text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      "projectId" uuid NOT NULL,
      name text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS api_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      hash text NOT NULL,
      "revokedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS webhooks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      url text NOT NULL,
      events text[] NOT NULL DEFAULT '{}',
      "circuitOpenedAt" timestamptz,
      "failureCount" int NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS webhooks`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS assets`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS memberships`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
