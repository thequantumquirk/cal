const fs = require('fs');
const path = require('path');

const imagePath = '/Users/bala/Downloads/Gemini_Generated_Image_7rcelh7rcelh7rce.png';
const svgPath = '/Users/bala/EZ/public/efficiency_logo.svg';

try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Create new SVG content
    // Dimensions are 2048 x 512 (4:1 ratio)
    // We'll set the viewBox to match the image dimensions
    const newSvgContent = `<svg width="2048" height="512" viewBox="0 0 2048 512" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image width="2048" height="512" xlink:href="data:image/png;base64,${base64Image}"/>
</svg>`;

    fs.writeFileSync(svgPath, newSvgContent);
    console.log('Successfully updated efficiency_logo.svg');

} catch (error) {
    console.error('Error updating logo:', error);
}
