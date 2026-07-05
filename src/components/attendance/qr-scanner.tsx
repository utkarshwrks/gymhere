"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkInByToken } from "@/lib/actions/attendance";

export function QrScanner() {
  const router = useRouter();
  const [scanning, setScanning] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = React.useRef<any>(null);
  const lockRef = React.useRef(false);

  const stop = React.useCallback(async () => {
    const s = scannerRef.current;
    if (s) {
      try { await s.stop(); await s.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  React.useEffect(() => () => { void stop(); }, [stop]);

  async function start() {
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    setScanning(true);
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        async (decoded: string) => {
          if (lockRef.current) return;
          lockRef.current = true;
          const r = await checkInByToken(decoded);
          if (r.ok) { setLast(r.data!.name); toast.success(`Checked in ${r.data!.name}`); router.refresh(); }
          else toast.error(r.error);
          setTimeout(() => { lockRef.current = false; }, 2500);
        },
        () => { /* ignore per-frame decode errors */ },
      );
    } catch {
      toast.error("Couldn't access the camera. Grant permission and try again.");
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div id="qr-reader" className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-black" />
      <div className="flex items-center justify-center gap-3">
        {!scanning ? (
          <Button onClick={start}>Start scanner</Button>
        ) : (
          <Button variant="outline" onClick={stop}>Stop</Button>
        )}
      </div>
      {last && (
        <p className="flex items-center justify-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-4" /> Last check-in: <strong>{last}</strong>
        </p>
      )}
    </div>
  );
}
