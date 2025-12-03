const fs = require('fs');
const path = require('path');

const inputPath = path.join(process.cwd(), 'public/efficiency_logo.svg');
const outputPath = path.join(process.cwd(), 'public/efficiency_logo_brand.svg');

const svgContent = fs.readFileSync(inputPath, 'utf8');

const pathRegex = /<path[^>]*>/g;
const paths = svgContent.match(pathRegex) || [];

let textPaths = [];
let iconPaths = [];
let backgroundPath = '';

paths.forEach(p => {
    if (p.includes('fill="#FDFDFD"') && p.includes('translate(0,0)')) {
        backgroundPath = p;
        return;
    }

    const transformMatch = p.match(/translate\(([\d\.]+),/);
    if (transformMatch) {
        const x = parseFloat(transformMatch[1]);
        if (x > 400) {
            const newPath = p.replace(/fill="[^"]*"/, 'fill="url(#brandGradient)"');
            iconPaths.push(newPath);
        } else {
            textPaths.push(p);
        }
    } else {
        textPaths.push(p);
    }
});

const newSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="684" height="143">
<defs>
    <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#006D77;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#D4AF37;stop-opacity:1" />
    </linearGradient>
</defs>
${backgroundPath}
${textPaths.join('\n')}
<g id="icon-group" transform="translate(40, 15) scale(0.6)">
    ${iconPaths.join('\n')}
</g>
</svg>`;

fs.writeFileSync(outputPath, newSvg);
console.log('Generated ' + outputPath);
