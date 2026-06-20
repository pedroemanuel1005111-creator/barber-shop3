import { sql } from "drizzle-orm";
import { db } from "./index";

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "barbershops" (
  "id" serial PRIMARY KEY,
  "slug" varchar(100) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "description" text,
  "address" varchar(500),
  "city" varchar(100),
  "phone" varchar(30),
  "whatsapp" varchar(30),
  "instagram" varchar(100),
  "open_time" varchar(5) DEFAULT '08:00' NOT NULL,
  "close_time" varchar(5) DEFAULT '20:00' NOT NULL,
  "slot_duration" integer DEFAULT 30 NOT NULL,
  "work_days" varchar(20) DEFAULT '1,2,3,4,5,6' NOT NULL,
  "activation_fee_cents" integer DEFAULT 7500 NOT NULL,
  "payment_reference_code" varchar(32) NOT NULL,
  "payment_transaction_id" varchar(100),
  "payment_validation_status" varchar(30) DEFAULT 'pending' NOT NULL,
  "payment_validation_score" integer DEFAULT 0 NOT NULL,
  "payment_validation_summary" text,
  "payment_validation_extracted_text" text,
  "payment_validation_checked_at" timestamp,
  "onboarding_status" varchar(30) DEFAULT 'pending_payment' NOT NULL,
  "payment_receipt_data_url" text,
  "payment_receipt_file_name" varchar(255),
  "payment_receipt_mime_type" varchar(100),
  "payment_receipt_notes" text,
  "payment_submitted_at" timestamp,
  "payment_approved_at" timestamp,
  "payment_rejected_at" timestamp,
  "payment_rejected_reason" text,
  "access_released_at" timestamp,
  "is_active" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "barbers" (
  "id" serial PRIMARY KEY,
  "barbershop_id" integer NOT NULL REFERENCES "barbershops"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "photo_data_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "services" (
  "id" serial PRIMARY KEY,
  "barbershop_id" integer NOT NULL REFERENCES "barbershops"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "price" integer NOT NULL,
  "duration" integer DEFAULT 30 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" serial PRIMARY KEY,
  "barbershop_id" integer NOT NULL REFERENCES "barbershops"("id") ON DELETE CASCADE,
  "barber_id" integer REFERENCES "barbers"("id") ON DELETE SET NULL,
  "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
  "service_name" varchar(255) NOT NULL,
  "service_price" integer NOT NULL,
  "barber_name" varchar(255),
  "client_name" varchar(255) NOT NULL,
  "client_phone" varchar(30) NOT NULL,
  "appointment_date" date NOT NULL,
  "time_slot" varchar(5) NOT NULL,
  "status" varchar(20) DEFAULT 'confirmed' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gallery" (
  "id" serial PRIMARY KEY,
  "barbershop_id" integer NOT NULL REFERENCES "barbershops"("id") ON DELETE CASCADE,
  "data_url" text NOT NULL,
  "file_name" varchar(255),
  "mime_type" varchar(100),
  "caption" varchar(255),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" serial PRIMARY KEY,
  "barbershop_id" integer NOT NULL REFERENCES "barbershops"("id") ON DELETE CASCADE,
  "token" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "platform_config" (
  "id" serial PRIMARY KEY,
  "key" varchar(100) NOT NULL UNIQUE,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "platform_config" ("key", "value") VALUES ('pix_key', '12957618400') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "platform_config" ("key", "value") VALUES ('activation_fee_cents', '7500') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "platform_config" ("key", "value") VALUES ('whatsapp_approval_number', '5582999375324') ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "barber_id" integer REFERENCES "barbers"("id") ON DELETE SET NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "barber_name" varchar(255);
ALTER TABLE "barbers" ADD COLUMN IF NOT EXISTS "work_days" varchar(20) DEFAULT '1,2,3,4,5,6' NOT NULL;
`;

export async function ensureTables(): Promise<void> {
  try {
    await db.execute(sql.raw(CREATE_TABLES_SQL));
    console.log("[db-setup] Tables verified successfully.");
  } catch (error) {
    console.error("[db-setup] Failed to verify tables:", error);
    throw error;
  }
}
