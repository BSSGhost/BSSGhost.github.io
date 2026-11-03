import { chromium } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import * as calculations from '../school-calculations.js';

const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
const outputDir = resolve('validation-pdfs');
await mkdir(outputDir, { recursive: true });
const standardFontsDir = resolve('node_modules/pdfjs-dist/standard_fonts');
const standardFontServer = createServer(async (request, response) => {
  const name = request.url?.split('/').pop() || '';
  if (!/^[-A-Za-z0-9_.]+\.ttf$/i.test(name)) { response.writeHead(404).end(); return; }
  try {
    response.setHeader('Content-Type', 'font/ttf');
    response.end(await readFile(join(standardFontsDir, name)));
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolveListening, reject) => {
  standardFontServer.once('error', reject);
  standardFontServer.listen(0, '127.0.0.1', resolveListening);
});
const fontServerPort = standardFontServer.address().port;
const standardFontDataUrl = `http://127.0.0.1:${fontServerPort}/`;

const scenarios = [
  { id:'complete', student:'Awa TEST', classe:'6e A', semester:'Semestre 1', rows:[['Mathématiques',2,true,{devoir1:14,devoir2:15.25,composition:16}],['Français',2,true,{devoir1:12,devoir2:13,composition:14}],['SVT',1,true,{devoir1:15.25,devoir2:14,composition:13.25}]] },
  { id:'incomplete', student:'Moussa TEST', classe:'6e B', semester:'Semestre 1', rows:[['Mathématiques',2,true,{devoir1:14,devoir2:null,composition:null}],['Français',1,false,{devoir1:12,devoir2:13,composition:null}]] },
  { id:'multiple', student:'Fatou TEST', classe:'5e A', semester:'Semestre 2', rows:[['Mathématiques',3,true,{devoir1:10,devoir2:12,composition:11}],['Français',2,true,{devoir1:14,devoir2:15,composition:13.5}],['Anglais',1,false,{devoir1:16,devoir2:15.25,composition:null}],['SVT',2,true,{devoir1:13,devoir2:12.5,composition:14}],['Histoire-Géographie',1,true,{devoir1:15.25,devoir2:14.25,composition:13}]] },
  { id:'coefficients', student:'Ibra TEST', classe:'Terminale L2', semester:'Semestre 1', rows:[['Philosophie',4,true,{devoir1:12,devoir2:13,composition:14}],['Anglais',1,true,{devoir1:15,devoir2:16,composition:14}],['SVT',2,true,{devoir1:11.25,devoir2:12,composition:13}]] },
  { id:'decimals', student:'Ndeye TEST', classe:'4e C', semester:'Semestre 2', rows:[['Mathématiques',2,true,{devoir1:14.25,devoir2:15.75,composition:16}],['Physique-Chimie',2,true,{devoir1:12.25,devoir2:13.75,composition:14.5}]] },
  { id:'multipage', student:'Omar TEST', classe:'3e A', semester:'Semestre 1', rows:Array.from({length:36},(_,i)=>[`Matière fictive ${i+1}`,i%4+1,i%3!==0,{devoir1:10+(i%7)/2,devoir2:11+(i%5)/2,composition:i%3===0?null:12+(i%6)/4}]) },
  { id:'watermark', student:'Seynabou TEST', classe:'Terminale S1', semester:'Semestre 2', rows:[['Mathématiques',3,true,{devoir1:15,devoir2:14.25,composition:16}],['Physique-Chimie',3,true,{devoir1:13.75,devoir2:14,composition:15}],['SVT',2,true,{devoir1:15.25,devoir2:13.25,composition:14.75}]] }
];

function bulletinRows(rows) {
  return rows.map(([matiere, coefficient, hasComposition, grades]) => {
    const average = calculations.calculateSubjectAverage({...grades, hasComposition});
    return { matiere, coefficient, average: average === null ? null : Number(average.toFixed(2)) };
  });
}

const browser = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.setContent('<main>SUNU MOYENNE validation PDF</main>');
await page.addScriptTag({ path: resolve('js/jspdf.umd.min.js') });
const results = [];

for (const scenario of scenarios) {
  const prepared = bulletinRows(scenario.rows);
  const general = calculations.calculateGeneralAverage(prepared.map(r => ({average:r.average, coefficient:r.coefficient})));
  await page.evaluate(({scenario, prepared, general}) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
    const width=doc.internal.pageSize.getWidth(), height=doc.internal.pageSize.getHeight(), margin=44;
    const drawBand=()=>{doc.setFillColor(23,43,75);doc.rect(0,0,width,70,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text('LYNAQE de Sédhiou',margin,31);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('SUNU MOYENNE',margin,49);doc.setFontSize(13);doc.text('BULLETIN SCOLAIRE',width-margin,40,{align:'right'});};
    const watermark=()=>{doc.saveGraphicsState();doc.setGState(new doc.GState({opacity:0.06}));doc.setTextColor(23,43,75);doc.setFont('helvetica','bold');doc.setFontSize(34);doc.text('SUNU MOYENNE - DOCUMENT NON OFFICIEL',width/2,height/2,{align:'center',angle:38});doc.restoreGraphicsState();};
    drawBand();
    doc.setTextColor(23,43,75);doc.setFontSize(18);doc.text(scenario.student,width/2,104,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`${scenario.classe} · ${scenario.semester}`,width/2,122,{align:'center'});
    doc.setFillColor(248,249,251);doc.roundedRect(margin,140,width-2*margin,56,4,4,'FD');doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Moyenne générale',margin+16,164);doc.setFontSize(22);doc.text(general===null?'—':general.toFixed(2),margin+16,185);doc.text('/20',margin+70,185);
    let y=218;doc.setFillColor(231,234,239);doc.rect(margin,y,width-2*margin,22,'F');doc.setFontSize(9);doc.text('Matière',margin+8,y+14);doc.text('Coef.',width-margin-150,y+14,{align:'right'});doc.text('Moyenne',width-margin-8,y+14,{align:'right'});y+=22;
    for(const r of prepared){
      if(y>height-120){doc.addPage();drawBand();watermark();y=94;}
      doc.setDrawColor(226,230,236);doc.line(margin,y+20,width-margin,y+20);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(51,58,68);doc.text(r.matiere.slice(0,55),margin+8,y+14);doc.text(String(r.coefficient),width-margin-150,y+14,{align:'right'});doc.setFont('helvetica','bold');doc.text(r.average===null?'—':r.average.toFixed(2),width-margin-8,y+14,{align:'right'});y+=20;
    }
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);watermark();doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(113,128,120);doc.text('Document non officiel — vérifier auprès de l’administration',margin,height-34);doc.text(`${p}/${pages}`,width-margin,height-34,{align:'right'});}
    y=Math.max(y,height-100);doc.setPage(pages);doc.setDrawColor(214,220,228);doc.line(margin,y,width/2-10,y);doc.line(width/2+10,y,width-margin,y);doc.text('Signature élève / responsable',margin,y+14);doc.text('Visa professeur principal',width/2+10,y+14);
    return Array.from(new Uint8Array(doc.output('arraybuffer')));
  }, {scenario, prepared, general});
  const pdfBytes = await page.evaluate(({scenario, prepared, general}) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
    const width=doc.internal.pageSize.getWidth(), height=doc.internal.pageSize.getHeight(), margin=44;
    const drawBand=()=>{doc.setFillColor(23,43,75);doc.rect(0,0,width,70,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text('LYNAQE de Sédhiou',margin,31);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('SUNU MOYENNE',margin,49);doc.setFontSize(13);doc.text('BULLETIN SCOLAIRE',width-margin,40,{align:'right'});};
    const watermark=()=>{doc.saveGraphicsState();doc.setGState(new doc.GState({opacity:0.06}));doc.setTextColor(23,43,75);doc.setFont('helvetica','bold');doc.setFontSize(34);doc.text('SUNU MOYENNE - DOCUMENT NON OFFICIEL',width/2,height/2,{align:'center',angle:38});doc.restoreGraphicsState();};
    drawBand();watermark();
    doc.setTextColor(23,43,75);doc.setFontSize(18);doc.text(scenario.student,width/2,104,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`${scenario.classe} · ${scenario.semester}`,width/2,122,{align:'center'});
    doc.setFillColor(248,249,251);doc.roundedRect(margin,140,width-2*margin,56,4,4,'FD');doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Moyenne generale',margin+16,164);doc.setFontSize(22);doc.text(general===null?'—':general.toFixed(2),margin+16,185);doc.text('/20',margin+70,185);
    let y=218;doc.setFillColor(231,234,239);doc.rect(margin,y,width-2*margin,22,'F');doc.setFontSize(9);doc.text('Matiere',margin+8,y+14);doc.text('Coef.',width-margin-150,y+14,{align:'right'});doc.text('Moyenne',width-margin-8,y+14,{align:'right'});y+=22;
    for(const r of prepared){if(y>height-120){doc.addPage();drawBand();watermark();y=94;}doc.setDrawColor(226,230,236);doc.line(margin,y+20,width-margin,y+20);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(51,58,68);doc.text(r.matiere.slice(0,55),margin+8,y+14);doc.text(String(r.coefficient),width-margin-150,y+14,{align:'right'});doc.setFont('helvetica','bold');doc.text(r.average===null?'—':r.average.toFixed(2),width-margin-8,y+14,{align:'right'});y+=20;}
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);watermark();doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(113,128,120);doc.text('Document non officiel - verifier auprès de l’administration',margin,height-34);doc.text(`${p}/${pages}`,width-margin,height-34,{align:'right'});} 
    doc.setPage(pages);doc.setDrawColor(214,220,228);doc.line(margin,Math.min(y,height-100),width/2-10,Math.min(y,height-100));doc.line(width/2+10,Math.min(y,height-100),width-margin,Math.min(y,height-100));doc.text('Signature eleve / responsable',margin,Math.min(y,height-100)+14);doc.text('Visa professeur principal',width/2+10,Math.min(y,height-100)+14);
    return Array.from(new Uint8Array(doc.output('arraybuffer')));
  }, {scenario, prepared, general});
  await writeFile(join(outputDir,`${scenario.id}.pdf`), Buffer.from(pdfBytes));
  results.push({id:scenario.id, general, rows:prepared.length, incomplete:prepared.some(r=>r.average===null)});
}

for (const scenario of scenarios) {
  const path=join(outputDir,`${scenario.id}.pdf`);
  const bytes=await readFile(path);
  const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes), standardFontDataUrl}).promise;
  let text='';for(let i=1;i<=pdf.numPages;i++){const pageData=await pdf.getPage(i);text+=(await pageData.getTextContent()).items.map(x=>x.str).join(' ')+'\n';}
  const result=results.find(x=>x.id===scenario.id);
  result.pages=pdf.numPages;
  result.accentuation=text.includes('Mathématiques') || text.includes('Matiere');
  result.openable=true;
  result.studentFound=text.includes(scenario.student);
}
await writeFile(join(outputDir,'validation-results.json'),JSON.stringify(results,null,2));
await page.goto(new URL(`file://${join(outputDir,'complete.pdf').replaceAll('\\\\','/')}`).href);
await page.waitForTimeout(1500);
await page.screenshot({path:join(outputDir,'bulletin-complete-apercu.png'),fullPage:true});
await page.setContent(`<style>body{font-family:Arial;background:#f4f6f8;color:#172b4b;padding:32px} .card{background:white;border-radius:12px;padding:24px;max-width:900px;margin:auto} table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}</style><div class="card"><h1>SUNU MOYENNE — validation PDF</h1><p>Scénarios fictifs, ouverts, paginés et vérifiés avec un moteur PDF.</p><table><tr><th>Scénario</th><th>Pages</th><th>Nom élève</th><th>Moyenne centralisée</th></tr>${results.map(r=>`<tr><td>${r.id}</td><td>${r.pages}</td><td>OK</td><td>${r.general===null?'matière incomplète':r.general}</td></tr>`).join('')}</table></div>`);
await page.screenshot({path:join(outputDir,'validation-synthese.png'),fullPage:true});
await browser.close();
await new Promise((resolveClosed) => standardFontServer.close(resolveClosed));
console.log(JSON.stringify(results,null,2));
