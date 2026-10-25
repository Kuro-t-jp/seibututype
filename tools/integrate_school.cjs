// Add the reviewed classroom collection without replacing existing species or artwork.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),folder=path.resolve(root,process.argv[3]||'assets/biome-school-20261024');
const rows=JSON.parse(fs.readFileSync(path.resolve(root,process.argv[2]||'data/biome-school-expansion.json')));
async function main(){
 const records=JSON.parse(fs.readFileSync(path.join(folder,'generation-records.json'))),manifestPath=path.join(root,'assets/biome-production-20261023/manifest.json');
 const manifest=JSON.parse(fs.readFileSync(manifestPath)),report=[];
 for(const row of rows){
  const source=path.join(folder,`species-${row.id}.png`);
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels}=info;
  // Pack the four generated sprites into equal runtime cells, preserving every visible pixel.
  // The transparent gap is found independently in each column; generated subjects need not
  // share an exact horizontal midpoint. Fail rather than cutting through an illustration.
  if(row.artMode==='portrait'){
   const image=await sharp(source).trim().resize(320,320,{fit:'inside'}).png().toBuffer(),m=await sharp(image).metadata();
   await sharp({create:{width:384,height:384,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:image,left:Math.floor((384-m.width)/2),top:Math.floor((384-m.height)/2)}]).webp({quality:78,alphaQuality:100,effort:6}).toFile(path.join(root,'assets/biome-runtime','species-'+row.id+'.webp'));
   const rec=records.find(x=>x.id===row.id),spec={id:'species-'+row.id,title:row.name,stages:['代表的な姿'],columns:1,rows:1,transparent:true,file:'../'+path.basename(folder)+'/'+rec.file,category:row.kind==='plant'?'植物':row.kind==='animal'?'動物':'観察生物',prompt:rec.prompt,width:w,height:h,artMode:'portrait'};
   const i=manifest.specs.findIndex(x=>x.id===spec.id);if(i<0)manifest.specs.push(spec);else manifest.specs[i]=spec;report.push({id:spec.id,layout:'portrait'});continue;
  }
  const xCounts=Array.from({length:w},(_,x)=>{let n=0;for(let y=0;y<h;y++)if(data[(y*w+x)*channels+3]>8)n++;return n;});
  const gap=(counts,start,end)=>{const runs=[];let a=null;for(let i=start;i<=end;i++){if(counts[i]===0){if(a===null)a=i;}else if(a!==null){runs.push([a,i-1]);a=null;}}if(a!==null)runs.push([a,end]);runs.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));if(!runs.length)throw Error('No empty sprite separator');return Math.floor((runs[0][0]+runs[0][1])/2);};
  const midX=gap(xCounts,Math.floor(w*.43),Math.floor(w*.57));
  const parts=[],boxes=[];
  for(let col=0;col<2;col++){
   const left=col?midX:0,right=col?w:midX;
   const counts=Array.from({length:h},(_,y)=>{let n=0;for(let x=left;x<right;x++)if(data[(y*w+x)*channels+3]>8)n++;return n;});
   const midY=gap(counts,Math.floor(h*.38),Math.floor(h*.62));
   for(let rowIndex=0;rowIndex<2;rowIndex++){
    const top=rowIndex?midY:0,bottom=rowIndex?h:midY;let x0=w,y0=h,x1=0,y1=0;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*w+x)*channels+3]>0){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    if(x0>=x1||y0>=y1)throw Error(row.id+' empty sprite');
    const box={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};boxes[rowIndex*2+col]=box;
    const image=await sharp(source).extract(box).resize(164,164,{fit:'inside'}).png().toBuffer(),m=await sharp(image).metadata();
    parts.push({input:image,left:col*192+Math.floor((192-m.width)/2),top:rowIndex*192+Math.floor((192-m.height)/2)});
   }
  }
  const id='species-'+row.id;
  await sharp({create:{width:384,height:384,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(parts).webp({quality:78,alphaQuality:100,effort:6}).toFile(path.join(root,'assets/biome-runtime',id+'.webp'));
  const rec=records.find(x=>x.id===row.id),spec={id,title:row.name,stages:row.stages,columns:2,rows:2,transparent:true,file:'../'+path.basename(folder)+'/'+rec.file,category:row.kind==='plant'?'植物':'動物',prompt:rec.prompt,revisionPrompt:rec.revisionPrompt,width:w,height:h,frameAspectRatio:1,runtimePacking:boxes};
  const i=manifest.specs.findIndex(x=>x.id===id);if(i<0)manifest.specs.push(spec);else manifest.specs[i]=spec;
  report.push({id,boxes});
 }
 manifest.sheetCount=manifest.specs.length;manifest.speciesCount=require('../src/biome.js').SPECIES.length;
 manifest.frameCount=manifest.specs.reduce((n,s)=>n+s.columns*s.rows,0);
 manifest.status='Integrated game artwork; classroom expansion has reviewed silhouettes, stage labels and source-linked learning cards. Not identification plates.';
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(folder,'sprite-packing.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`${rows.length} classroom species packed; ${manifest.speciesCount} species / ${manifest.frameCount} frames total`);
}
main().catch(e=>{console.error(e);process.exit(1)});
