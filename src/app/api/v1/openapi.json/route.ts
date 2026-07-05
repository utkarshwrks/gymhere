import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** OpenAPI 3.0 spec for the GymHere public API. Import this URL into Postman. */
export function GET() {
  const base = `${env.NEXT_PUBLIC_APP_URL}/api/v1`;
  const listResponse = {
    type: "object",
    properties: { object: { type: "string" }, count: { type: "integer" }, data: { type: "array", items: { type: "object" } } },
  };

  const spec = {
    openapi: "3.0.3",
    info: { title: "GymHere API", version: "1.0.0", description: "Metered REST API for gym data. Authenticate with `Authorization: Bearer ghk_...`." },
    servers: [{ url: base }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "ghk" } },
    },
    paths: {
      "/members": {
        get: { summary: "List members", responses: { "200": { description: "OK", content: { "application/json": { schema: listResponse } } }, "401": { description: "Invalid key" }, "429": { description: "Rate limited" } } },
        post: {
          summary: "Create a member",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["full_name", "phone"], properties: { full_name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, plan_id: { type: "string" }, start_date: { type: "string" } } } } } },
          responses: { "201": { description: "Created" }, "403": { description: "Missing write scope" }, "422": { description: "Validation error" } },
        },
      },
      "/members/{id}": { get: { summary: "Get a member", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "404": { description: "Not found" } } } },
      "/attendance": { post: { summary: "Check a member in", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { member_id: { type: "string" }, qr_token: { type: "string" } } } } } }, responses: { "201": { description: "Checked in" }, "404": { description: "Member not found" } } } },
      "/classes": { get: { summary: "List classes", responses: { "200": { description: "OK", content: { "application/json": { schema: listResponse } } } } } },
      "/bookings": { post: { summary: "Book a class", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["schedule_id", "member_id", "booking_date"], properties: { schedule_id: { type: "string" }, member_id: { type: "string" }, booking_date: { type: "string" } } } } } }, responses: { "201": { description: "Booked" }, "409": { description: "Class full" } } } },
      "/plans": { get: { summary: "List membership plans", responses: { "200": { description: "OK", content: { "application/json": { schema: listResponse } } } } } },
      "/invoices": { get: { summary: "List invoices", responses: { "200": { description: "OK", content: { "application/json": { schema: listResponse } } } } } },
    },
  };

  return NextResponse.json(spec);
}
