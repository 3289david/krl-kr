import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const queryIp = url.searchParams.get("ip")?.trim();

  // If a specific IP is requested, look that up; otherwise look up visitor's IP
  const visitorIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const targetIp = queryIp || visitorIp;

  // For visitor's own IP: use Cloudflare headers if available (faster, no external call)
  if (!queryIp) {
    const country = request.headers.get("cf-ipcountry") ?? null;
    const city = request.headers.get("cf-ipcity") ?? null;
    const region = request.headers.get("cf-region") ?? null;

    // If CF provides geo info, return immediately
    if (country) {
      return NextResponse.json({
        ip: visitorIp,
        country,
        city,
        region,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // For specific IP lookups or when CF geo is unavailable: use ip-api.com
  if (targetIp !== "unknown" && !targetIp.startsWith("127.") && !targetIp.startsWith("::1")) {
    try {
      const geoRes = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(targetIp)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json() as Record<string, string | number | null>;
        if (geoData.status === "success") {
          return NextResponse.json({
            ip: geoData.query ?? targetIp,
            country: geoData.country ?? null,
            country_code: geoData.countryCode ?? null,
            city: geoData.city ?? null,
            region: geoData.regionName ?? null,
            region_code: geoData.region ?? null,
            zip: geoData.zip ?? null,
            lat: geoData.lat ?? null,
            lon: geoData.lon ?? null,
            timezone: geoData.timezone ?? null,
            isp: geoData.isp ?? null,
            org: geoData.org ?? null,
            as: geoData.as ?? null,
            timestamp: new Date().toISOString(),
          });
        } else {
          return NextResponse.json(
            { error: geoData.message ?? "IP 조회 실패", ip: targetIp },
            { status: 400 }
          );
        }
      }
    } catch {
      // ignore geo lookup failure, fall through
    }
  }

  // Fallback: return just the IP without geo
  return NextResponse.json({
    ip: targetIp,
    timestamp: new Date().toISOString(),
  });
}
