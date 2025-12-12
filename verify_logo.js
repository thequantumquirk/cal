const fs = require('fs');
const svgPath = '/Users/bala/EZ/public/efficiency_logo.svg';

try {
    const content = fs.readFileSync(svgPath, 'utf8');
    console.log('File size:', content.length);
    console.log('Starts with:', content.substring(0, 150));

    if (content.includes('width="2048"') && content.includes('height="512"')) {
        console.log('Dimensions verified.');
    } else {
        console.log('Dimensions mismatch.');
    }

    if (content.includes('data:image/png;base64,')) {
        console.log('Base64 image data found.');
    } else {
        console.log('Base64 image data missing.');
    }

} catch (error) {
    console.error('Error verifying logo:', error);
}
