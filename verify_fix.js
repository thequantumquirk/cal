const fs = require('fs');
const svgPath = '/Users/bala/EZ/public/efficiency_logo.svg';

try {
    const content = fs.readFileSync(svgPath, 'utf8');

    console.log('File size:', content.length);

    if (content.includes('<svg x="0"')) {
        console.log('Icon viewport found.');
    }

    if (content.includes('viewBox="362 0')) {
        console.log('Text viewport found.');
    }

    if (content.includes('clipPath')) {
        console.log('Warning: Clip paths still present (should be removed).');
    } else {
        console.log('Clip paths removed (good).');
    }

} catch (error) {
    console.error('Error verifying logo:', error);
}
