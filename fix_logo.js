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

        // 2. Compose SVG using nested <svg> for robust clipping
        const splitX = 362;

        // Scaling
        const iconScale = 0.25; // Small
        const textScale = 1.0;  // Large

        const iconOriginalW = splitX;
        const textOriginalW = width - splitX;

        const iconW = iconOriginalW * iconScale;
        const iconH = height * iconScale;

        const textW = textOriginalW * textScale;
        const textH = height * textScale;

        const gap = 20;

        const totalWidth = Math.ceil(iconW + gap + textW);
        const totalHeight = Math.ceil(Math.max(iconH, textH));

        // Center vertically
        const iconY = (totalHeight - iconH) / 2;
        const textY = (totalHeight - textH) / 2;

        const svgContent = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
    <image id="full-logo" width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64Image}"/>
</defs>

<!-- Icon Part -->
<!-- viewBox crops to 0..splitX -->
<svg x="0" y="${iconY}" width="${iconW}" height="${iconH}" viewBox="0 0 ${splitX} ${height}">
    <use xlink:href="#full-logo"/>
</svg>

<!-- Text Part -->
<!-- viewBox crops to splitX..width -->
<svg x="${iconW + gap}" y="${textY}" width="${textW}" height="${textH}" viewBox="${splitX} 0 ${textOriginalW} ${height}">
    <!-- Note: viewBox x is splitX. This means the coordinate system starts at splitX. -->
    <!-- The image is drawn at 0. So we need to shift the image? -->
    <!-- No, if viewBox="362 0 ...", it means the visible window starts at x=362. -->
    <!-- The content (image) is at 0. So the part of the image at 362 will be at the left edge of the viewport. -->
    <!-- This is exactly what we want. -->
    <use xlink:href="#full-logo"/>
</svg>

</svg>`;

        fs.writeFileSync(outputPath, svgContent);
        console.log('Successfully created fixed efficiency_logo.svg');
        console.log(`Dimensions: ${totalWidth}x${totalHeight}`);

    } catch (error) {
        console.error('Error processing logo:', error);
    }
}

processAndCreateSvg();
