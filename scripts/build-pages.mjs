import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
await fs.mkdir(output,{recursive:true});
for(const file of ['index.html','app.js','refresh-state.js','chart-comparison.js','styles.css','data.json','favicon.svg'])await fs.copyFile(path.join(root,file),path.join(output,file));
// Each changed asset gets a new URL so already-open browsers load the published version.
const fingerprint=content=>createHash('sha256').update(content).digest('hex').slice(0,12);
const hashFile=async file=>fingerprint(await fs.readFile(path.join(output,file)));
const stateHash=await hashFile('refresh-state.js'),comparisonHash=await hashFile('chart-comparison.js'),dataHash=await hashFile('data.json');
let app=await fs.readFile(path.join(output,'app.js'),'utf8');
if(!app.includes("from './refresh-state.js'")||!app.includes("from './chart-comparison.js'")||!app.includes("fetch('data.json')"))throw new Error('Dashboard asset references changed; update the publication build.');
app=app.replace("from './refresh-state.js'",`from './refresh-state.js?v=${stateHash}'`).replace("from './chart-comparison.js'",`from './chart-comparison.js?v=${comparisonHash}'`).replace("fetch('data.json')",`fetch('data.json?v=${dataHash}',{cache:'no-store'})`);
await fs.writeFile(path.join(output,'app.js'),app);
let html=await fs.readFile(path.join(output,'index.html'),'utf8');
for(const [file,attribute] of [['app.js','src'],['styles.css','href'],['favicon.svg','href']]) {
  const reference=`${attribute}="${file}"`;
  if(!html.includes(reference))throw new Error('Missing dashboard asset: '+file);
  html=html.replace(reference,`${attribute}="${file}?v=${await hashFile(file)}"`);
}
await fs.writeFile(path.join(output,'index.html'),html);
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log('GitHub Pages artifact: '+output);
