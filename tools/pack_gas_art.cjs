// GAS-only delivery copies. Keep source artwork and the normal web edition untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),source=path.join(root,'assets/biome-runtime'),out=path.join(root,'assets/biome-gas-runtime');
const specs=JSON.parse(fs.readFileSync(path.join(root,'assets/biome-production-20261023/manifest.json'))).specs.slice(92);
const settings={width:288,height:288,quality:72,alphaQuality:90,effort:6};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const records=[];
 for(const spec of specs){
  const input=fs.readFileSync(path.join(source,spec.id+'.webp')),before=await sharp(input).metadata();
  // Resize the whole sheet, so the 2x2 life stages stay aligned. No crop, recoloring or generation.
  const encoded=await sharp(input).resize({width:settings.width,height:settings.height,fit:'inside',withoutEnlargement:true}).webp({quality:settings.quality,alphaQuality:settings.alphaQuality,effort:settings.effort}).toBuffer();
  const bytes=encoded.length<input.length?encoded:input,after=await sharp(bytes).metadata();
  if(before.hasAlpha&&!after.hasAlpha)throw Error('Transparency lost: '+spec.id);
  if(Math.abs(before.width/before.height-after.width/after.height)>.001)throw Error('Aspect ratio changed: '+spec.id);
  fs.writeFileSync(path.join(out,spec.id+'.webp'),bytes);
  records.push({id:spec.id,sourceSha256:hash(input),sha256:hash(bytes),beforeBytes:input.length,bytes:bytes.length,width:after.width,height:after.height,hasAlpha:!!after.hasAlpha});
 }
 const report={format:1,sharpVersion:sharp.versions.sharp,settings,sourceBytes:records.reduce((n,r)=>n+r.beforeBytes,0),bytes:records.reduce((n,r)=>n+r.bytes,0),records};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`${records.length} GAS images: ${report.sourceBytes} -> ${report.bytes} bytes (${Math.round((1-report.bytes/report.sourceBytes)*100)}% smaller)`);
})().catch(e=>{console.error(e);process.exit(1)});
