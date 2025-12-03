const sharp = require('sharp');

const inputPath = '/Users/bala/.gemini/antigravity/brain/a1313dcb-9a8a-4f0e-9716-80c87d9b7bb7/uploaded_image_1764511103485.png';
const outputPath = '/Users/bala/EZ/public/efficiency_logo_gold.png';

async function processImage() {
    try {
        console.log('Reading image...');
        const { data, info } = await sharp(inputPath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        console.log('Processing pixels...');
        const pixelArray = new Uint8ClampedArray(data.buffer);

        // Threshold for "white" (0-255)
        // We'll be aggressive since the logo is black text and gold icon
        const threshold = 240;

        for (let i = 0; i < pixelArray.length; i += 4) {
            const r = pixelArray[i];
            const g = pixelArray[i + 1];
            const b = pixelArray[i + 2];

            // If pixel is close to white, make it transparent
            if (r > threshold && g > threshold && b > threshold) {
                pixelArray[i + 3] = 0; // Set Alpha to 0
            }
        }

        console.log('Saving processed image...');
        await sharp(Buffer.from(pixelArray), {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
            .trim() // Also trim any transparent edges
            .toFormat('png')
            .toFile(outputPath);

        console.log('Success! Saved to', outputPath);

    } catch (error) {
        console.error('Error:', error);
    }
}

processImage();
