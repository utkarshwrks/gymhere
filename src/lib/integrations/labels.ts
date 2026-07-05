/** Client-safe integration constants — no db/env imports so client components
 * can use these without pulling the server DB module into the browser bundle. */
export const SERVICE_LABELS: Record<string, string> = {
  payments: "Payments (Razorpay)",
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email (Resend)",
  storage: "File storage",
};

/** Services that expose a credential form on the gym integrations page. */
export const FORM_SERVICES = ["payments", "email", "sms", "whatsapp"] as const;
