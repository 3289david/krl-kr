import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const pkg = request.nextUrl.searchParams.get("pkg")?.trim().toLowerCase();
  if (!pkg) return NextResponse.json({ error: "pkg 파라미터가 필요합니다." }, { status: 400 });
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(pkg)) {
    return NextResponse.json({ error: "올바른 패키지 이름이 아닙니다." }, { status: 400 });
  }

  const db = getDB(request);
  const now = Date.now();

  const cached = await db.prepare("SELECT * FROM dep_cache WHERE package_name = ?").bind(pkg).first() as Record<string, unknown> | null;
  if (cached && (now - Number(cached.fetched_at)) < CACHE_TTL) {
    return NextResponse.json(JSON.parse(cached.data as string), { headers: { "X-Cache": "HIT" } });
  }

  // Fetch from npm registry
  const [regRes, dlRes] = await Promise.all([
    fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, { headers: { Accept: "application/vnd.npm.install-v1+json" } }),
    fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`),
  ]);

  if (!regRes.ok) {
    if (regRes.status === 404) return NextResponse.json({ error: "패키지를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: "npm 레지스트리 오류입니다." }, { status: 502 });
  }

  const reg = await regRes.json() as Record<string, unknown>;
  const dl = dlRes.ok ? await dlRes.json() as Record<string, unknown> : {};

  const latest = (reg["dist-tags"] as Record<string, string>)?.latest;
  const versions = Object.keys(reg.versions as Record<string, unknown> ?? {});
  const latestMeta = (reg.versions as Record<string, Record<string, unknown>>)?.[latest] ?? {};

  const deps = Object.keys(latestMeta.dependencies as Record<string, string> ?? {});
  const devDeps = Object.keys(latestMeta.devDependencies as Record<string, string> ?? {});
  const peerDeps = Object.keys(latestMeta.peerDependencies as Record<string, string> ?? {});

  // Security: check for known malicious patterns (basic heuristics)
  const suspiciousPatterns = ["postinstall", "preinstall", "install"];
  const scripts = latestMeta.scripts as Record<string, string> ?? {};
  const riskFactors: string[] = [];
  for (const p of suspiciousPatterns) {
    if (scripts[p]) riskFactors.push(`${p} 스크립트 실행`);
  }
  if (!latestMeta.repository) riskFactors.push("저장소 없음");
  if (!latestMeta.license) riskFactors.push("라이선스 없음");
  const riskLevel = riskFactors.length === 0 ? "낮음" : riskFactors.length <= 1 ? "보통" : "높음";

  const result = {
    name: reg.name,
    description: reg.description,
    latest,
    versions: versions.slice(-10).reverse(),
    version_count: versions.length,
    downloads_last_month: Number(dl.downloads ?? 0),
    homepage: latestMeta.homepage,
    repository: (latestMeta.repository as Record<string, string>)?.url ?? null,
    license: latestMeta.license,
    author: latestMeta.author,
    keywords: latestMeta.keywords,
    dependencies: deps,
    dev_dependencies: devDeps,
    peer_dependencies: peerDeps,
    dep_count: deps.length,
    dev_dep_count: devDeps.length,
    scripts: Object.keys(scripts),
    risk_level: riskLevel,
    risk_factors: riskFactors,
    npm_url: `https://npmjs.com/package/${pkg}`,
    fetched_at: now,
  };

  // Cache in DB
  const dataStr = JSON.stringify(result);
  if (cached) {
    await db.prepare("UPDATE dep_cache SET data = ?, fetched_at = ? WHERE package_name = ?").bind(dataStr, now, pkg).run();
  } else {
    await db.prepare("INSERT INTO dep_cache (id, package_name, data, fetched_at) VALUES (?, ?, ?, ?)").bind(generateId("dpc"), pkg, dataStr, now).run();
  }

  return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
}
