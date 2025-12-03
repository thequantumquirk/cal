const sharp = require('sharp');
const fs = require('fs');

const inputPath = '/Users/bala/Downloads/Gemini_Generated_Image_7rcelh7rcelh7rce.png';
const outputPath = '/Users/bala/EZ/public/efficiency_logo.svg';

async function processAndCreateSvg() {
    try {
        // 1. Remove white background
        // We'll use a threshold to make near-white pixels transparent
        const image = sharp(inputPath);
        const { width, height } = await image.metadata();

        const buffer = await image
            .ensureAlpha()
            .raw()
            .toBuffer();

        // Simple background removal: if pixel is light enough, make it transparent
        // A better approach with sharp might be using 'trim' if it was solid color, 
        // but for "near white" we often need pixel manipulation or a band threshold.
        // Let's do manual pixel manipulation for better control over "white-ish" pixels.

        const newBuffer = Buffer.from(buffer);
        for (let i = 0; i < newBuffer.length; i += 4) {
            const r = newBuffer[i];
            const g = newBuffer[i + 1];
            const b = newBuffer[i + 2];

            // If it's very light (e.g. > 240), make it transparent
            if (r > 240 && g > 240 && b > 240) {
                newBuffer[i + 3] = 0; // Alpha = 0
            }
        }

        const processedImageBuffer = await sharp(newBuffer, { raw: { width, height, channels: 4 } })
            .png()
            .toBuffer();

        const base64Image = processedImageBuffer.toString('base64');

        // 2. Compose SVG
        // Split point was ~362
        const splitX = 362;

        // We want:
        // Icon: Smaller (scale down)
        // Text: Larger (scale up)

        // Let's define the SVG. We'll keep a wide canvas.
        // We'll use two <image> tags referencing the same base64 data (to avoid duplicating data size if possible, 
        // but SVG data URI doesn't support internal referencing easily without defining it in <defs>).
        // Best to put base64 in a <defs> <image id="src"> and use <use>.

        const svgContent = `<svg width="2048" height="512" viewBox="0 0 2048 512" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
    <image id="full-logo" width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64Image}"/>
    <clipPath id="icon-clip">
        <rect x="0" y="0" width="${splitX}" height="${height}"/>
    </clipPath>
    <clipPath id="text-clip">
        <rect x="${splitX}" y="0" width="${width - splitX}" height="${height}"/>
    </clipPath>
</defs>

<!-- Icon: Scaled down (0.7) and centered vertically -->
<!-- Original center of icon is roughly splitX/2 = 181 -->
<!-- We want to scale it around its center -->
<g transform="translate(181, 256) scale(0.7) translate(-181, -256)">
    <use xlink:href="#full-logo" clip-path="url(#icon-clip)"/>
</g>

<!-- Text: Scaled up (1.2) and moved slightly left to close gap -->
<!-- Text starts at splitX. Center of text area is roughly splitX + (width-splitX)/2 -->
<g transform="translate(${splitX}, 0)">
    <!-- Shift text left to bring it closer to icon -->
    <g transform="translate(-50, 0)"> 
        <g transform="translate(${(width - splitX) / 2}, 256) scale(1.2) translate(-${(width - splitX) / 2}, -256)">
             <!-- We need to shift the use back by splitX because the clip is in absolute coordinates -->
             <g transform="translate(-${splitX}, 0)">
                <use xlink:href="#full-logo" clip-path="url(#text-clip)"/>
             </g>
        </g>
    </g>
</g>

</svg>`;

        // Wait, the transforms for the text part are getting complicated because of the clip path.
        // Simpler approach:
        // Use <svg> viewports.

        const simplerSvg = `<svg width="2048" height="512" viewBox="0 0 2048 512" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
    <image id="full-logo" width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64Image}"/>
</defs>

<!-- Icon Part -->
<!-- Viewbox 0 0 362 512. We place it in a smaller area to scale down. -->
<!-- Original width 362. Scale 0.7 => width ~253. -->
<!-- Centered vertically. -->
<svg x="20" y="50" width="${splitX * 0.7}" height="${height * 0.7}" viewBox="0 0 ${splitX} ${height}">
    <use xlink:href="#full-logo"/>
</svg>

<!-- Text Part -->
<!-- Viewbox 362 0 1686 512. -->
<!-- Scale 1.2. Width ~2023. -->
<!-- Positioned after the icon. -->
<svg x="${splitX * 0.7 + 40}" y="-20" width="${(width - splitX) * 1.2}" height="${height * 1.2}" viewBox="${splitX} 0 ${width - splitX} ${height}">
    <!-- We need to translate the image inside because viewBox starts at splitX -->
    <!-- Actually, if viewBox is defined as x=splitX, it shows that part of the coordinate system. -->
    <!-- So we just place the image at 0,0 and the viewBox crops it? No, viewBox defines the visible window. -->
    <!-- If we use <use> it places image at 0,0. -->
    <!-- So viewBox="${splitX} 0 ..." will show the part of the image starting at splitX. Correct. -->
    <use xlink:href="#full-logo"/>
</svg>

</svg>`;

        fs.writeFileSync(outputPath, simplerSvg);
        console.log('Successfully created refined efficiency_logo.svg');

    } catch (error) {
        console.error('Error processing logo:', error);
    }
}

processAndCreateSvg();
