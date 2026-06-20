import {
  pgTable,
  serial,
  varchar,
  date,
  timestamp,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const platformConfig = pgTable("platform_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const barbershops = pgTable("barbershops", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  description: text("description"),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  instagram: varchar("instagram", { length: 100 }),
  openTime: varchar("open_time", { length: 5 }).default("08:00").notNull(),
  closeTime: varchar("close_time", { length: 5 }).default("20:00").notNull(),
  slotDuration: integer("slot_duration").default(30).notNull(),
  workDays: varchar("work_days", { length: 20 }).default("1,2,3,4,5,6").notNull(),
  activationFeeCents: integer("activation_fee_cents").default(7500).notNull(),
  paymentReferenceCode: varchar("payment_reference_code", { length: 32 }).notNull(),
  paymentTransactionId: varchar("payment_transaction_id", { length: 100 }),
  paymentValidationStatus: varchar("payment_validation_status", { length: 30 }).default("pending").notNull(),
  paymentValidationScore: integer("payment_validation_score").default(0).notNull(),
  paymentValidationSummary: text("payment_validation_summary"),
  paymentValidationExtractedText: text("payment_validation_extracted_text"),
  paymentValidationCheckedAt: timestamp("payment_validation_checked_at"),
  onboardingStatus: varchar("onboarding_status", { length: 30 }).default("pending_payment").notNull(),
  paymentReceiptDataUrl: text("payment_receipt_data_url"),
  paymentReceiptFileName: varchar("payment_receipt_file_name", { length: 255 }),
  paymentReceiptMimeType: varchar("payment_receipt_mime_type", { length: 100 }),
  paymentReceiptNotes: text("payment_receipt_notes"),
  paymentSubmittedAt: timestamp("payment_submitted_at"),
  paymentApprovedAt: timestamp("payment_approved_at"),
  paymentRejectedAt: timestamp("payment_rejected_at"),
  paymentRejectedReason: text("payment_rejected_reason"),
  accessReleasedAt: timestamp("access_released_at"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const barbers = pgTable("barbers", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershops.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  photoDataUrl: text("photo_data_url"),
  workDays: varchar("work_days", { length: 20 }).default("1,2,3,4,5,6").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershops.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  duration: integer("duration").default(30).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershops.id, { onDelete: "cascade" }),
  dataUrl: text("data_url").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  caption: varchar("caption", { length: 255 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershops.id, { onDelete: "cascade" }),
  barberId: integer("barber_id").references(() => barbers.id, { onDelete: "set null" }),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  servicePrice: integer("service_price").notNull(),
  barberName: varchar("barber_name", { length: 255 }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 30 }).notNull(),
  appointmentDate: date("appointment_date").notNull(),
  timeSlot: varchar("time_slot", { length: 5 }).notNull(),
  status: varchar("status", { length: 20 }).default("confirmed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershops.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
