CREATE TYPE "public"."credential_status" AS ENUM('unverified', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_mode" AS ENUM('platform', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."integration_service" AS ENUM('payments', 'sms', 'whatsapp', 'email', 'storage');--> statement-breakpoint
CREATE TABLE "integration_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid,
	"service" "integration_service" NOT NULL,
	"mode" "integration_mode" DEFAULT 'platform' NOT NULL,
	"allow_platform_fallback" boolean DEFAULT true NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"service" "integration_service" NOT NULL,
	"encrypted_payload" text NOT NULL,
	"key_hint" text,
	"status" "credential_status" DEFAULT 'unverified' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"error" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_policies" ADD CONSTRAINT "integration_policies_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_policies" ADD CONSTRAINT "integration_policies_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_credentials" ADD CONSTRAINT "tenant_credentials_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_credentials" ADD CONSTRAINT "tenant_credentials_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;