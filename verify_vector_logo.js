const fs = require('fs');
const svgPath = '/Users/bala/EZ/public/efficiency_logo.svg';

try {
    const content = fs.readFileSync(svgPath, 'utf8');

    if (content.includes('id="gold-gradient"')) {
        console.log('Gradient definition found.');
    } else {
        console.error('Gradient definition MISSING.');
    }

    const urlCount = (content.match(/url\(#gold-gradient\)/g) || []).length;
    console.log(`Found ${urlCount} paths using the gold gradient.`);

    if (urlCount > 0) {
        console.log('Verification SUCCESS.');
    } else {
        console.error('Verification FAILED: No paths using gradient.');
    }

} catch (error) {
    console.error('Error verifying logo:', error);
}
