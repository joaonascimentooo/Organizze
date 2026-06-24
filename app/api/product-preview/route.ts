import { NextRequest, NextResponse } from "next/server";

const allowedStores = [
  "shopee.com.br",
  "shopee.com",
  "shein.com",
  "amazon.com.br",
  "amazon.com",
  "mercadolivre.com.br",
  "mercadolivre.com",
  "magazineluiza.com.br",
  "kabum.com.br",
  "aliexpress.com",
];

function isAllowedStore(url: URL) {
  return url.protocol === "https:" && allowedStores.some((domain) =>
    url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  );
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function readMeta(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`, "i");
  return decodeHtml(propertyFirst.exec(html)?.[1] || contentFirst.exec(html)?.[1] || "");
}

async function fetchStorePage(initialUrl: URL) {
  let currentUrl = initialUrl;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrganizzePreview/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirecionamento inválido");
      const redirectedUrl = new URL(location, currentUrl);
      if (!isAllowedStore(redirectedUrl)) throw new Error("Redirecionamento não permitido");
      currentUrl = redirectedUrl;
      continue;
    }

    if (!response.ok) throw new Error("A loja recusou a prévia");
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) throw new Error("Conteúdo inválido");
    return { html: (await response.text()).slice(0, 2_000_000), finalUrl: currentUrl };
  }
  throw new Error("Muitos redirecionamentos");
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url")?.trim();
  if (!value) return NextResponse.json({ error: "Informe o link do produto." }, { status: 400 });

  let productUrl: URL;
  try {
    productUrl = new URL(value);
  } catch {
    return NextResponse.json({ error: "O link informado não é válido." }, { status: 400 });
  }

  if (!isAllowedStore(productUrl)) {
    return NextResponse.json({ error: "Esta loja ainda não é compatível com a prévia automática." }, { status: 400 });
  }

  try {
    const { html, finalUrl } = await fetchStorePage(productUrl);
    const title = readMeta(html, "og:title") || readMeta(html, "twitter:title");
    const rawImage = readMeta(html, "og:image") || readMeta(html, "twitter:image");
    let imageUrl = "";
    if (rawImage) {
      const parsedImage = new URL(rawImage, finalUrl);
      if (parsedImage.protocol === "https:") imageUrl = parsedImage.href;
    }

    if (!title && !imageUrl) throw new Error("Prévia indisponível");
    return NextResponse.json({ title, imageUrl, productUrl: finalUrl.href }, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch {
    return NextResponse.json({ error: "A loja não disponibilizou a imagem automaticamente. Você ainda pode salvar o link." }, { status: 422 });
  }
}
