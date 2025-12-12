const fs = require('fs');
const svgPath = '/Users/bala/EZ/public/efficiency_logo.svg';

try {
    const content = fs.readFileSync(svgPath, 'utf8');

    console.log('File size:', content.length);

    if (content.includes('scale(0.65)')) {
        console.log('Icon scaling found.');
    } else {
        console.log('Icon scaling missing.');
    }

    if (content.includes('scale(0.85)')) {
        console.log('Text scaling found.');
    } else {
        console.log('Text scaling missing.');
    }

    if (content.includes('clipPath id="icon-clip"')) {
        console.log('Clip paths found.');
    }

} catch (error) {
    console.error('Error verifying logo:', error);
}
