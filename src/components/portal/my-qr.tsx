"use client";

import { QRCodeSVG } from "qrcode.react";

export function MyQr({ token, memberName, gymName }: { token: string; memberName: string; gymName: string }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 py-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Check-in code</h1>
        <p className="mt-1 text-sm text-muted-foreground">Show this at the {gymName} front desk to check in.</p>
      </div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <QRCodeSVG value={token} size={240} level="M" marginSize={2} />
      </div>
      <div className="text-center">
        <p className="font-medium">{memberName}</p>
        <p className="font-mono text-xs text-muted-foreground">{token}</p>
      </div>
    </div>
  );
}
