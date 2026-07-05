import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { productBrands, products, purchases, vendors } from "@/lib/db/schema";
import { listMembers } from "@/lib/queries/members";
import { StoreView } from "@/components/store/store-view";

export const metadata: Metadata = { title: "Supplement store" };
export const dynamic = "force-dynamic";

export default async function StorePage() {
  const ctx = await requireGym();
  const [productRows, brandRows, vendorRows, purchaseRows, membersList] = await Promise.all([
    db.select().from(products).where(eq(products.gymId, ctx.gym.id)).orderBy(desc(products.createdAt)),
    db.select().from(productBrands).where(eq(productBrands.gymId, ctx.gym.id)),
    db.select().from(vendors).where(eq(vendors.gymId, ctx.gym.id)),
    db.select().from(purchases).where(eq(purchases.gymId, ctx.gym.id)).orderBy(desc(purchases.createdAt)),
    listMembers(ctx.gym.id),
  ]);

  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const vendorName = new Map(vendorRows.map((v) => [v.id, v.name]));

  return (
    <StoreView
      products={productRows.map((p) => ({ id: p.id, name: p.name, brand: p.brandId ? brandName.get(p.brandId) ?? null : null, sellPricePaise: p.sellPricePaise, gstPercent: Number(p.gstPercent), stockQty: p.stockQty }))}
      brands={brandRows.map((b) => ({ id: b.id, name: b.name }))}
      vendors={vendorRows.map((v) => ({ id: v.id, name: v.name, gstNumber: v.gstNumber, phone: v.phone }))}
      purchases={purchaseRows.map((p) => ({ id: p.id, vendor: vendorName.get(p.vendorId) ?? "—", vendorId: p.vendorId, totalPaise: p.totalPaise, paidPaise: p.paidPaise, purchasedOn: p.purchasedOn }))}
      members={membersList.map((m) => ({ id: m.id, name: m.fullName }))}
    />
  );
}
