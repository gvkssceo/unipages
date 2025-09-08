const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function main() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const pdfName = 'Converting a React Web Application into a Progressive Web App (PWA).pdf';
  const pdfPath = path.join(projectRoot, pdfName);
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at: ${pdfPath}`);
    process.exit(1);
  }
  const dataBuffer = fs.readFileSync(pdfPath);
  const result = await pdfParse(dataBuffer);
  const outPath = path.join(__dirname, 'pdf-text.txt');
  fs.writeFileSync(outPath, result.text, 'utf8');
  console.log(outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


