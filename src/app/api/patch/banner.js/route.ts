import { NextRequest, NextResponse } from "next/server";

// Serves the embeddable banner script
// Usage: <script src="https://krl.kr/api/patch/banner.js?key=YOUR_SITE_KEY"></script>
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://krl.kr";

  const js = `(function(){
  var key="${key.replace(/"/g, "")}";
  if(!key)return;
  fetch("${origin}/api/v1/patch/"+key)
    .then(function(r){return r.json()})
    .then(function(d){
      if(!d||!d.is_active)return;
      var banner=document.createElement("div");
      var s=banner.style;
      s.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 16px;font-family:system-ui,sans-serif;font-size:14px;font-weight:500;line-height:1.4;box-shadow:0 2px 8px rgba(0,0,0,.15);";
      s.background=d.bg_color||"#1e40af";
      s.color=d.text_color||"#fff";
      var msg=document.createElement("span");
      msg.textContent=d.message||"";
      banner.appendChild(msg);
      if(d.cta_text&&d.cta_url){
        var btn=document.createElement("a");
        btn.href=d.cta_url;
        btn.textContent=d.cta_text;
        btn.target="_blank";
        btn.rel="noopener";
        var bs=btn.style;
        bs.cssText="padding:4px 12px;border-radius:4px;border:1px solid rgba(255,255,255,.4);color:inherit;text-decoration:none;font-size:12px;white-space:nowrap;";
        banner.appendChild(btn);
      }
      var close=document.createElement("button");
      close.innerHTML="&#215;";
      close.setAttribute("aria-label","닫기");
      var cs=close.style;
      cs.cssText="background:none;border:none;color:inherit;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;margin-left:auto;opacity:.7;";
      close.onclick=function(){banner.remove();document.body.style.marginTop="";};
      banner.appendChild(close);
      document.body.style.marginTop="44px";
      document.body.prepend(banner);
    }).catch(function(){});
})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=30",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
