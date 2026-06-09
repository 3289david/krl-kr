import { NextRequest, NextResponse } from "next/server";

// Embeddable guestbook widget
// Usage: <script src="https://krl.kr/api/guestbook/embed.js?key=YOUR_SLUG"></script>
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://krl.kr";

  const js = `(function(){
var key="${key.replace(/"/g, "")}";
if(!key)return;
var el=document.getElementById("krl-guestbook")||document.currentScript.parentElement;
if(!el)return;

var BASE="${origin}";
var page=1;
var total=0;

function rel(ts){var d=Date.now()-ts;if(d<60000)return "방금";if(d<3600000)return Math.floor(d/60000)+"분 전";if(d<86400000)return Math.floor(d/3600000)+"시간 전";return new Date(ts).toLocaleDateString("ko-KR");}

function render(entries,append){
  if(!append){
    var list=el.querySelector(".krl-gb-list");
    if(list)list.remove();
  }
  var list=el.querySelector(".krl-gb-list")||document.createElement("div");
  list.className="krl-gb-list";
  entries.forEach(function(e){
    var item=document.createElement("div");
    item.style.cssText="padding:12px 0;border-bottom:1px solid var(--color-hairline,#e5e7eb);";
    item.innerHTML="<div style='display:flex;align-items:center;gap:8px;margin-bottom:4px'><span style='font-weight:600;font-size:.875rem'>"+e.author_name+"</span><span style='color:#9ca3af;font-size:.75rem'>"+rel(e.created_at)+"</span></div><p style='margin:0;font-size:.9rem;line-height:1.6;color:#374151'>"+e.content.replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</p>";
    list.appendChild(item);
  });
  el.appendChild(list);
}

function load(p){
  fetch(BASE+"/api/v1/guestbook/"+key+"/entries?page="+p)
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.error)return;
      total=d.total;
      render(d.entries,p>1);
      var more=el.querySelector(".krl-gb-more");
      if(more)more.remove();
      if(d.entries.length>0&&d.entries.length===d.limit&&page*d.limit<total){
        var btn=document.createElement("button");
        btn.className="krl-gb-more";
        btn.textContent="더 보기";
        btn.style.cssText="margin-top:12px;padding:6px 16px;border:1px solid #d1d5db;border-radius:6px;background:transparent;cursor:pointer;font-size:.875rem;";
        btn.onclick=function(){page++;load(page);};
        el.appendChild(btn);
      }
    });
}

function buildForm(){
  var form=document.createElement("form");
  form.style.cssText="margin-bottom:20px;display:flex;flex-direction:column;gap:8px;";
  form.innerHTML="<input name='author_name' placeholder='이름 (선택)' style='padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:.875rem;font-family:inherit;'><textarea name='content' placeholder='방명록 남기기...' required rows='3' style='padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:.875rem;font-family:inherit;resize:vertical;'></textarea><button type='submit' style='padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:.875rem;font-weight:600;cursor:pointer;align-self:flex-end;'>등록</button><div class='krl-gb-msg' style='font-size:.8125rem;color:#6b7280'></div>";
  form.onsubmit=function(e){
    e.preventDefault();
    var msg=form.querySelector(".krl-gb-msg");
    msg.textContent="등록 중...";
    fetch(BASE+"/api/v1/guestbook/"+key+"/entries",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({author_name:form.author_name.value,content:form.content.value})
    }).then(function(r){return r.json()}).then(function(d){
      if(d.ok){form.reset();msg.textContent=d.pending?"승인 후 표시됩니다.":"등록되었습니다!";if(!d.pending){page=1;load(1);}}
      else{msg.textContent=d.error||"오류가 발생했습니다.";}
    }).catch(function(){msg.textContent="네트워크 오류";});
  };
  return form;
}

el.innerHTML="<style>.krl-gb-list div:last-child{border-bottom:none!important}</style>";
el.appendChild(buildForm());
load(1);
})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
