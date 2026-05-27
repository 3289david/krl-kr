import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const country = request.headers.get("cf-ipcountry") ?? null;
  const city = request.headers.get("cf-ipcity") ?? null;
  const region = request.headers.get("cf-region") ?? null;

  // If CF doesn't have geo, try ip-api.com (free, no key required)
  let geo: Record<string, string | null> = { country, city, region };
  if (!country && ip !== "unknown" && !ip.startsWith("127.") && !ip.startsWith("::1")) {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,regionName,city,isp,as,query`, {
        signal: AbortSignal.timeout(3000),
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        geo = {
          country: geoData.country ?? null,
          country_code: geoData.countryCode ?? null,
          city: geoData.city ?? null,
          region: geoData.regionName ?? null,
          isp: geoData.isp ?? null,
          as: geoData.as ?? null,
        };
      }
    } catch {
      // ignore geo lookup failure
    }
  }

  return NextResponse.json({
    ip,
    ...geo,
    timestamp: new Date().toISOString(),
  });
}
