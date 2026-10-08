export async function handleRefresh(request,refreshAll,allowedOrigins=[]) {
  const url=new URL(request.url),origin=request.headers.get('origin');
  const allowed=!origin||origin===url.origin||allowedOrigins.includes(origin);
  const headers={'Cache-Control':'no-store','Vary':'Origin'};
  if(!allowed)return Response.json({error:'허용된 대시보드에서만 조회할 수 있습니다.'},{status:403,headers});
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST')return Response.json({error:'POST 요청만 지원합니다.'},{status:405,headers:{...headers,Allow:'POST, OPTIONS'}});
  try {return Response.json(await refreshAll(),{headers});}
  catch {return Response.json({error:'전체 조회를 완료하지 못했습니다. 마지막 확인값을 유지합니다.'},{status:502,headers});}
}
