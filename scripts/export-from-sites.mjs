import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.resolve(root,process.argv[2]||'../../sites/econodash');
const endpoint='https://econodash-pulse-o8m4.cool-candy-5267.chatgpt.site/api/refresh';
const html=await fs.readFile(path.join(source,'lib/dashboard.html'),'utf8');
await fs.writeFile(path.join(root,'index.html'),html.replace('<title>',`<meta name="econodash-api-endpoint" content="${endpoint}">\n  <title>`));
for(const name of ['styles.css','refresh-state.js','data.json','favicon.svg'])await fs.copyFile(path.join(source,'public',name),path.join(root,name));
const app=await fs.readFile(path.join(source,'public/app.js'),'utf8');
if(!app.includes("fetch('/api/refresh',"))throw new Error('Refresh endpoint not found in source.');
await fs.writeFile(path.join(root,'app.js'),`const API_ENDPOINT=document.querySelector('meta[name="econodash-api-endpoint"]')?.content||'/api/refresh';\n`+app.replace("fetch('/api/refresh',","fetch(API_ENDPOINT,"));
await fs.mkdir(path.join(root,'lib'),{recursive:true});
await fs.copyFile(path.join(source,'lib/market-data.mjs'),path.join(root,'lib/market-data.mjs'));
const tests=await fs.readFile(path.join(source,'scripts/test-market-data.mjs'),'utf8');
await fs.writeFile(path.join(root,'scripts/test-market-data.mjs'),tests.replace("'../public/refresh-state.js'","'../refresh-state.js'"));
console.log('Exported dashboard assets, market providers and comparison tests.');
