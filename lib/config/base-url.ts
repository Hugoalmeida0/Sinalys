import { networkInterfaces } from "node:os";

function ehIpPrivado(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function obterIpLan(): string | null {
  const interfaces = networkInterfaces();
  for (const nome of Object.keys(interfaces)) {
    for (const info of interfaces[nome] ?? []) {
      if (info.family === "IPv4" && !info.internal && ehIpPrivado(info.address)) {
        return info.address;
      }
    }
  }
  return null;
}

export function resolverBaseUrlAbsoluta(headers: Headers): string {
  const host = headers.get("host") ?? "localhost:3000";
  const naVercel = Boolean(process.env.VERCEL);

  if (naVercel) return `https://${host}`;

  const [hostname, porta] = host.split(":");
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    const ipLan = obterIpLan();
    if (ipLan) return `http://${ipLan}${porta ? `:${porta}` : ""}`;
  }

  const protocolo = headers.get("x-forwarded-proto") ?? "http";
  return `${protocolo}://${host}`;
}
