import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceItems, invoices, members, payments } from "@/lib/db/schema";

export interface InvoiceListRow {
  id: string;
  number: string;
  memberName: string | null;
  status: string;
  totalPaise: number;
  duePaise: number;
  issuedOn: string;
}

export async function listInvoices(gymId: string): Promise<InvoiceListRow[]> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      totalPaise: invoices.totalPaise,
      duePaise: invoices.duePaise,
      issuedOn: invoices.issuedOn,
      memberName: members.fullName,
    })
    .from(invoices)
    .leftJoin(members, eq(invoices.memberId, members.id))
    .where(eq(invoices.gymId, gymId))
    .orderBy(desc(invoices.createdAt));
  return rows.map((r) => ({ ...r, memberName: r.memberName ?? null }));
}

export async function pendingDues(gymId: string): Promise<InvoiceListRow[]> {
  return (await listInvoices(gymId)).filter((i) => i.duePaise > 0 && i.status !== "cancelled");
}

export async function getInvoice(gymId: string, invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.gymId, gymId), eq(invoices.id, invoiceId)),
  });
  if (!invoice) return null;
  const [items, pays, member] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)),
    db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.createdAt)),
    invoice.memberId ? db.query.members.findFirst({ where: eq(members.id, invoice.memberId) }) : Promise.resolve(null),
  ]);
  return { invoice, items, payments: pays.filter((p) => p.status === "captured"), member };
}
