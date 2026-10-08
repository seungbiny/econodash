import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
await fs.mkdir(output,{recursive:true});
for(const file of ['index.html','app.js','refresh-state.js','styles.css','data.json','favicon.svg'])await fs.copyFile(path.join(root,file),path.join(output,file));
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log('GitHub Pages artifact: '+output);
