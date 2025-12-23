const fs = require('fs');
const svgPath = '/Users/bala/EZ/public/efficiency_logo.svg';

try {
    const content = fs.readFileSync(svgPath, 'utf8');

    console.log('File size:', content.length);

    if (content.includes('<svg x="20"')) {
        console.log('Icon part found.');
    } else {
        console.log('Icon part missing.');
    }

    if (content.includes('viewBox="362 0')) {
        console.log('Text part found.');
    } else {
        console.log('Text part missing.');
    }

    if (content.includes('data:image/png;base64,')) {
        console.log('Base64 image data found.');
    }

} catch (error) {
    console.error('Error verifying logo:', error);
}
