import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {refreshAll} from '../lib/market-data.mjs';
import {handleRefresh} from '../lib/refresh-api.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4174);
const prefix='/econodash/';
const assets=new Set(['index.html','app.js','refresh-state.js','chart-comparison.js','styles.css','data.json','favicon.svg']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};

http.createServer(async (incoming,outgoing)=>{
  try {
    const url=new URL(incoming.url,`http://${incoming.headers.host}`);
    if(url.pathname==='/api/refresh'){
      const chunks=[];for await(const chunk of incoming)chunks.push(chunk);
      const request=new Request(url,{method:incoming.method,headers:incoming.headers,...(!['GET','HEAD'].includes(incoming.method)&&chunks.length?{body:Buffer.concat(chunks)}:{})});
      const response=await handleRefresh(request,refreshAll);
      outgoing.writeHead(response.status,Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if(url.pathname==='/'||url.pathname==='/econodash'){
      outgoing.writeHead(302,{Location:prefix});outgoing.end();return;
    }
    const file=url.pathname.startsWith(prefix)?url.pathname.slice(prefix.length)||'index.html':'';
    if(!assets.has(file)||!['GET','HEAD'].includes(incoming.method)){
      outgoing.writeHead(404);outgoing.end('Not found');return;
    }
    let content=await fs.readFile(path.join(root,file));
    if(file==='index.html')content=Buffer.from(content.toString().replace(/(<meta name="econodash-api-endpoint" content=")[^"]*(">)/,'$1/api/refresh$2'));
    outgoing.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});
    outgoing.end(incoming.method==='HEAD'?undefined:content);
  } catch(error){
    console.error(error.message);
    outgoing.writeHead(500);outgoing.end('Preview failed');
  }
}).listen(port,'127.0.0.1',()=>console.log(`EconoDash preview: http://127.0.0.1:${port}${prefix}`));
