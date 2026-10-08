export async function handleRefresh(request,refreshAll,allowedOrigins=[],fallbackIds=[]) {
  const url=new URL(request.url),origin=request.headers.get('origin');
  const allowed=!origin||origin===url.origin||allowedOrigins.includes(origin);
  const headers={'Cache-Control':'no-store','Vary':'Origin'};
  if(!allowed)return Response.json({error:'허용된 대시보드에서만 조회할 수 있습니다.'},{status:403,headers});
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST')return Response.json({error:'POST 요청만 지원합니다.'},{status:405,headers:{...headers,Allow:'POST, OPTIONS'}});
  let ids=fallbackIds;
  if(request.headers.get('content-type')?.includes('application/json')){
    try {
      ids=(await request.json()).ids;
      if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||!id.length||id.length>50)||new Set(ids).size!==ids.length)throw Error('Invalid indicators');
    } catch {return Response.json({error:'조회할 지표 목록을 확인하지 못했습니다.'},{status:400,headers});}
  }
  try {
    const result=await refreshAll();
    if(!ids.length)return Response.json(result,{headers});
    const found=new Map(result.results.map(item=>[item.id,item]));
    if(ids.some(id=>!found.has(id)))return Response.json({error:'지원하지 않는 지표가 포함되어 있습니다.'},{status:400,headers});
    const results=ids.map(id=>found.get(id));
    return Response.json({...result,results,succeeded:results.filter(item=>item.ok).length,failed:results.filter(item=>!item.ok).length},{headers});
  }
  catch {return Response.json({error:'전체 조회를 완료하지 못했습니다. 마지막 확인값을 유지합니다.'},{status:502,headers});}
}
