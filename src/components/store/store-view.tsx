"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createBrand, createProduct, createVendor, payVendor, recordPurchase, recordSale } from "@/lib/actions/pos";
import { formatMoney } from "@/lib/format";

interface Product { id: string; name: string; brand: string | null; sellPricePaise: number; gstPercent: number; stockQty: number }
interface Vendor { id: string; name: string; gstNumber: string | null; phone: string | null }
interface Purchase { id: string; vendor: string; vendorId: string; totalPaise: number; paidPaise: number; purchasedOn: string }
interface Opt { id: string; name: string }

export function StoreView({
  products, brands, vendors, purchases, members,
}: {
  products: Product[];
  brands: Opt[];
  vendors: Vendor[];
  purchases: Purchase[];
  members: Opt[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Supplement store" description="Products, stock, counter sales and vendor purchases." />
      <Tabs defaultValue="products">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="sell">Counter sale</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="products"><ProductsTab products={products} brands={brands} /></TabsContent>
        <TabsContent value="sell"><SellTab products={products} members={members} /></TabsContent>
        <TabsContent value="purchases"><PurchasesTab purchases={purchases} vendors={vendors} products={products} /></TabsContent>
        <TabsContent value="vendors"><VendorsTab vendors={vendors} purchases={purchases} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab({ products, brands }: { products: Product[]; brands: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Products & stock</CardTitle>
        <div className="flex gap-2">
          <BrandButton onDone={() => router.refresh()} />
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Product</Button>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <EmptyState icon={Boxes} title="No products" description="Add supplements to sell at the counter." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Brand</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">GST</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.brand ?? "—"}</TableCell>
                  <TableCell className="text-right tnum">{formatMoney(p.sellPricePaise)}</TableCell>
                  <TableCell className="text-right tnum">{p.gstPercent}%</TableCell>
                  <TableCell className="text-right"><Badge variant={p.stockQty > 0 ? "muted" : "destructive"}>{p.stockQty}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ProductDialog open={open} onOpenChange={setOpen} brands={brands} onDone={() => router.refresh()} />
    </Card>
  );
}

function BrandButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Brand</Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New brand</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optimum Nutrition" />
        <DialogFooter>
          <Button onClick={async () => { const r = await createBrand(name); if (r.ok) { toast.success("Brand added"); setName(""); setOpen(false); onDone(); } else toast.error(r.error); }}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductDialog({ open, onOpenChange, brands, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; brands: Opt[]; onDone: () => void }) {
  const [brandId, setBrandId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createProduct({ name: String(fd.get("name")), brandId, sku: String(fd.get("sku") || ""), sellRupees: Number(fd.get("sell")), gstPercent: Number(fd.get("gst") || 0) });
    setPending(false);
    if (r.ok) { toast.success("Product added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input name="name" required placeholder="Whey Protein 1kg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>SKU</Label><Input name="sku" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Sell price (₹)</Label><Input name="sell" type="number" min={0} required /></div>
            <div className="space-y-1.5"><Label>GST %</Label><Input name="gst" type="number" min={0} max={28} defaultValue={18} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add product"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SellTab({ products, members }: { products: Product[]; members: Opt[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = React.useState("");
  const [method, setMethod] = React.useState<"cash" | "upi" | "card">("cash");
  const [cart, setCart] = React.useState<{ productId: string; qty: number }[]>([]);
  const [paid, setPaid] = React.useState(0);
  const [pending, setPending] = React.useState(false);

  const byId = new Map(products.map((p) => [p.id, p]));
  const subtotal = cart.reduce((s, c) => s + (byId.get(c.productId)?.sellPricePaise ?? 0) * c.qty, 0);
  const gst = cart.reduce((s, c) => { const p = byId.get(c.productId); return s + Math.round(((p?.sellPricePaise ?? 0) * c.qty * (p?.gstPercent ?? 0)) / 100); }, 0);
  const total = subtotal + gst;

  React.useEffect(() => setPaid(total / 100), [total]);

  async function submit() {
    if (cart.length === 0) return toast.error("Add products to the cart.");
    setPending(true);
    const r = await recordSale({ memberId: memberId || "", items: cart, method, paidRupees: paid });
    setPending(false);
    if (r.ok) { toast.success("Sale recorded"); setCart([]); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Counter sale</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Customer</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Walk-in" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Add product</Label>
            <Select value="" onValueChange={(pid) => setCart((c) => c.find((x) => x.productId === pid) ? c : [...c, { productId: pid, qty: 1 }])}>
              <SelectTrigger><SelectValue placeholder="Pick a product" /></SelectTrigger>
              <SelectContent>{products.filter((p) => p.stockQty > 0).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {formatMoney(p.sellPricePaise)} ({p.stockQty} in stock)</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((c) => {
              const p = byId.get(c.productId)!;
              return (
                <div key={c.productId} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={1} max={p.stockQty} value={c.qty} onChange={(e) => setCart((cs) => cs.map((x) => x.productId === c.productId ? { ...x, qty: Number(e.target.value) } : x))} className="w-16" />
                    <span className="tnum w-24 text-right text-sm">{formatMoney(p.sellPricePaise * c.qty)}</span>
                    <Button variant="ghost" size="icon" onClick={() => setCart((cs) => cs.filter((x) => x.productId !== c.productId))}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div className="space-y-1 text-sm">
            <div className="flex gap-6"><span className="text-muted-foreground">Subtotal</span><span className="tnum">{formatMoney(subtotal)}</span></div>
            <div className="flex gap-6"><span className="text-muted-foreground">GST</span><span className="tnum">{formatMoney(gst)}</span></div>
            <div className="flex gap-6 font-semibold"><span>Total</span><span className="tnum">{formatMoney(total)}</span></div>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5"><Label>Paid (₹)</Label><Input type="number" min={0} value={paid} onChange={(e) => setPaid(Number(e.target.value))} className="w-28" /></div>
            <div className="space-y-1.5"><Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={submit} disabled={pending || cart.length === 0}>{pending ? "Saving…" : "Sell"}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PurchasesTab({ purchases, vendors, products }: { purchases: Purchase[]; vendors: Vendor[]; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Purchases</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)} disabled={vendors.length === 0 || products.length === 0}><Plus className="size-4" /> New purchase</Button>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <EmptyState icon={Boxes} title="No purchases" description="Record stock purchases to raise inventory and vendor payables." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.vendor}</TableCell>
                  <TableCell>{p.purchasedOn}</TableCell>
                  <TableCell className="text-right tnum">{formatMoney(p.totalPaise)}</TableCell>
                  <TableCell className="text-right tnum">{formatMoney(p.paidPaise)}</TableCell>
                  <TableCell className="text-right tnum">{formatMoney(p.totalPaise - p.paidPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <PurchaseDialog open={open} onOpenChange={setOpen} vendors={vendors} products={products} onDone={() => router.refresh()} />
    </Card>
  );
}

function PurchaseDialog({ open, onOpenChange, vendors, products, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; vendors: Vendor[]; products: Product[]; onDone: () => void }) {
  const [vendorId, setVendorId] = React.useState("");
  const [items, setItems] = React.useState<{ productId: string; qty: number; costRupees: number }[]>([]);
  const [paid, setPaid] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const total = items.reduce((s, i) => s + i.qty * i.costRupees, 0);

  async function submit() {
    if (!vendorId) return toast.error("Pick a vendor.");
    if (items.length === 0) return toast.error("Add items.");
    setPending(true);
    const r = await recordPurchase({ vendorId, purchasedOn: new Date().toISOString().slice(0, 10), paidRupees: paid, items });
    setPending(false);
    if (r.ok) { toast.success("Purchase recorded"); onOpenChange(false); setItems([]); onDone(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New purchase</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger>
              <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Add item</Label>
            <Select value="" onValueChange={(pid) => setItems((c) => c.find((x) => x.productId === pid) ? c : [...c, { productId: pid, qty: 1, costRupees: 0 }])}>
              <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {items.map((it) => {
            const p = products.find((x) => x.id === it.productId)!;
            return (
              <div key={it.productId} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.name}</span>
                <Input type="number" min={1} value={it.qty} onChange={(e) => setItems((c) => c.map((x) => x.productId === it.productId ? { ...x, qty: Number(e.target.value) } : x))} className="w-16" placeholder="Qty" />
                <Input type="number" min={0} value={it.costRupees || ""} onChange={(e) => setItems((c) => c.map((x) => x.productId === it.productId ? { ...x, costRupees: Number(e.target.value) } : x))} className="w-24" placeholder="Cost ₹" />
              </div>
            );
          })}
          <div className="flex items-end justify-between border-t pt-3">
            <span className="text-sm font-semibold">Total {formatMoney(total * 100)}</span>
            <div className="space-y-1.5"><Label>Paid now (₹)</Label><Input type="number" min={0} value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} className="w-28" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? "Saving…" : "Record purchase"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorsTab({ vendors, purchases }: { vendors: Vendor[]; purchases: Purchase[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const dueByVendor = new Map<string, number>();
  for (const p of purchases) dueByVendor.set(p.vendorId, (dueByVendor.get(p.vendorId) ?? 0) + (p.totalPaise - p.paidPaise));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Vendors</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Vendor</Button>
      </CardHeader>
      <CardContent>
        {vendors.length === 0 ? (
          <EmptyState icon={Boxes} title="No vendors" description="Add suppliers to track purchases and payables." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>GST</TableHead><TableHead className="text-right">Payable</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-muted-foreground">{v.gstNumber ?? "—"}</TableCell>
                  <TableCell className="text-right tnum">{formatMoney(dueByVendor.get(v.id) ?? 0)}</TableCell>
                  <TableCell className="text-right"><PayVendorButton vendorId={v.id} onDone={() => router.refresh()} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <VendorDialog open={open} onOpenChange={setOpen} onDone={() => router.refresh()} />
    </Card>
  );
}

function PayVendorButton({ vendorId, onDone }: { vendorId: string; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Pay</Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Pay vendor</DialogTitle></DialogHeader>
        <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        <DialogFooter><Button onClick={async () => { const r = await payVendor({ vendorId, amountRupees: amount }); if (r.ok) { toast.success("Payment recorded"); setOpen(false); onDone(); } else toast.error(r.error); }}>Record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createVendor({ name: String(fd.get("name")), gstNumber: String(fd.get("gst") || ""), phone: String(fd.get("phone") || "") });
    setPending(false);
    if (r.ok) { toast.success("Vendor added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New vendor</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input name="name" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>GST number</Label><Input name="gst" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add vendor"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
