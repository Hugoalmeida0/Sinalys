import { networkInterfaces } from "node:os";

/** RFC 1918: só essas faixas são roteáveis dentro de uma rede local. */
function ehIpPrivado(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * Primeiro IPv4 de rede local da máquina (ex.: 192.168.x.x). Usado só em dev
 * local: expõe o servidor pra outros dispositivos da mesma rede (o celular do
 * cliente, lendo o QR code em uma call) — "localhost" no QR seria lido como
 * "o próprio celular" e nunca alcançaria o servidor.
 *
 * Filtra por faixa RFC 1918, não só `!internal`: adaptadores de VPN/túnel
 * (Tailscale, ZeroTier, VPNs corporativas etc.) também aparecem como
 * externos e podem vir antes da interface Wi-Fi/Ethernet real na enumeração
 * do SO, mas o endereço deles não é alcançável pelo celular na mesma rede.
 */
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

/**
 * Base URL absoluta da requisição atual, corrigida por ambiente:
 * - Na Vercel (`process.env.VERCEL` — setado automaticamente em toda build/
 *   runtime lá), usa o host da própria requisição em HTTPS: já é o domínio
 *   público real (produção ou preview), então é só respeitar o que veio.
 * - Local (`next dev`), se o host da requisição for localhost/127.0.0.1,
 *   troca só o hostname pelo IP de LAN da máquina, mantendo a porta — assim
 *   um link/QR gerado em `localhost:3000` funciona a partir de outro
 *   dispositivo na mesma rede.
 */
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
