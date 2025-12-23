const sharp = require('sharp');
const fs = require('fs');

const inputPath = '/Users/bala/Downloads/Gemini_Generated_Image_7rcelh7rcelh7rce.png';
const outputPath = '/Users/bala/EZ/public/efficiency_logo.svg';

async function processAndCreateSvg() {
    try {
        // 1. Remove white background
        const image = sharp(inputPath);
        const { width, height } = await image.metadata();

        const buffer = await image
            .ensureAlpha()
            .raw()
            .toBuffer();

        const newBuffer = Buffer.from(buffer);
        for (let i = 0; i < newBuffer.length; i += 4) {
            const r = newBuffer[i];
            const g = newBuffer[i + 1];
            const b = newBuffer[i + 2];
            if (r > 240 && g > 240 && b > 240) {
                newBuffer[i + 3] = 0;
            }
        }

        const processedImageBuffer = await sharp(newBuffer, { raw: { width, height, channels: 4 } })
            .png()
            .toBuffer();

        const base64Image = processedImageBuffer.toString('base64');

        // 2. Compose SVG
        const splitX = 362;

        // Scaling factors
        // User wants Icon smaller, Text larger.
        // Source: Icon H=240, Text H=230.
        // Let's make Text visually larger.
        const iconScale = 0.33;
        const textScale = 0.85;

        // Calculate dimensions
        const iconW = splitX * iconScale;
        const iconH = height * iconScale;

        const textW = (width - splitX) * textScale;
        const textH = height * textScale;

        // Vertical alignment
        // We want to align the centers of the CONTENT.
        // Icon Content Center Y: (131+371)/2 = 251.
        // Text Content Center Y: (130+360)/2 = 245. (Approx from density)
        // They are roughly centered in the 512px height (256).
        // So aligning the 512px blocks centers should work.

        // We will place Icon at (0, 0) (relative to its scaled box)
        // And Text at (iconW + gap, 0)
        const gap = 20;

        // Root ViewBox
        // Width = iconW + gap + textW
        // Height = max(iconH, textH)
        const totalWidth = Math.ceil(iconW + gap + textW);
        const totalHeight = Math.ceil(Math.max(iconH, textH));

        // Offsets to center vertically in the totalHeight
        const iconY = (totalHeight - iconH) / 2;
        const textY = (totalHeight - textH) / 2;

        const svgContent = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
    <image id="full-logo" width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64Image}"/>
    <clipPath id="icon-clip">
        <rect x="0" y="0" width="${splitX}" height="${height}"/>
    </clipPath>
    <clipPath id="text-clip">
        <rect x="${splitX}" y="0" width="${width - splitX}" height="${height}"/>
    </clipPath>
</defs>

<!-- Icon Group -->
<!-- 1. Clip the icon part -->
<!-- 2. Translate origin to (0,0) of the icon part (it's already at 0,0) -->
<!-- 3. Scale -->
<!-- 4. Translate to final position -->
<g transform="translate(0, ${iconY}) scale(${iconScale})">
    <use xlink:href="#full-logo" clip-path="url(#icon-clip)"/>
</g>

<!-- Text Group -->
<!-- 1. Clip the text part -->
<!-- 2. Translate so the text part starts at 0 (shift left by splitX) -->
<!-- 3. Scale -->
<!-- 4. Translate to final position -->
<g transform="translate(${iconW + gap}, ${textY}) scale(${textScale}) translate(-${splitX}, 0)">
    <use xlink:href="#full-logo" clip-path="url(#text-clip)"/>
</g>

</svg>`;

        fs.writeFileSync(outputPath, svgContent);
        console.log('Successfully created corrected efficiency_logo.svg');
        console.log(`Dimensions: ${totalWidth}x${totalHeight}`);

    } catch (error) {
        console.error('Error processing logo:', error);
    }
}

processAndCreateSvg();
