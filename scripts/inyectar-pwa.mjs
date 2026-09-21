import fs from 'fs';
import path from 'path';

const indexHtmlPath = path.join(process.cwd(), 'dist', 'index.html');

try {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  if (!html.includes('rel="manifest"')) {
    const tags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#FFFDF8" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
  </head>`;
    
    html = html.replace('</head>', tags);
    fs.writeFileSync(indexHtmlPath, html);
    console.log('Etiquetas PWA inyectadas en dist/index.html');
  } else {
    console.log('Las etiquetas PWA ya estaban inyectadas');
  }
} catch (err) {
  console.error('Error al inyectar PWA tags:', err);
  process.exit(1);
}
