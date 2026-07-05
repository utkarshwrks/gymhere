"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Cpu, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDevice, simulatePunch } from "@/lib/actions/devices";

interface Device { id: string; name: string; serial: string }
interface Opt { id: string; name: string }

export function DeviceSimulator({ devices, members }: { devices: Device[]; members: Opt[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [memberId, setMemberId] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function fire() {
    if (!memberId) return toast.error("Pick a member.");
    setPending(true);
    const r = await simulatePunch(memberId);
    setPending(false);
    if (r.ok) toast.success(`Punch registered — checked ${r.data?.direction === "in" ? "IN" : "OUT"}`);
    else toast.error(r.error);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await addDevice(name); if (r.ok) { toast.success("Device registered"); setName(""); router.refresh(); } else toast.error(r.error); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Front door reader" />
            <Button type="submit" disabled={!name.trim()}><Plus className="size-4" /> Add</Button>
          </form>
          {devices.length === 0 ? (
            <EmptyState icon={Cpu} title="No devices" description="Register an ESSL-style device to receive punches." />
          ) : (
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-medium">{d.name}</p><p className="font-mono text-xs text-muted-foreground">{d.serial}</p></div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fire a punch</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Pick a member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={fire} disabled={pending || !memberId} className="w-full"><Radio className="size-4" /> {pending ? "Sending…" : "Simulate punch"}</Button>
          <p className="text-xs text-muted-foreground">First punch checks the member in; the next checks them out with a duration.</p>
        </CardContent>
      </Card>
    </div>
  );
}
