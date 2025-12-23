const sharp = require('sharp');

const inputPath = '/Users/bala/Downloads/Gemini_Generated_Image_7rcelh7rcelh7rce.png';
const splitX = 362;

async function profileDensity() {
    try {
        const image = sharp(inputPath);
        const { width, height } = await image.metadata();

        const rawBuffer = await image
            .ensureAlpha()
            .raw()
            .toBuffer();

        const rowDensities = [];

        for (let y = 0; y < height; y++) {
            let nonWhitePixels = 0;
            for (let x = splitX; x < width; x++) {
                const offset = (y * width + x) * 4;
                const r = rawBuffer[offset];
                const g = rawBuffer[offset + 1];
                const b = rawBuffer[offset + 2];

                if (!(r > 240 && g > 240 && b > 240)) {
                    nonWhitePixels++;
                }
            }
            rowDensities.push(nonWhitePixels);
        }

        // Output densities to find the dip
        // We expect a peak (EFFICIENCY), a dip (gap), and a peak (Subtitle)

        // Simple smoothing
        const smoothed = [];
        for (let i = 0; i < rowDensities.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i - 2); j <= Math.min(rowDensities.length - 1, i + 2); j++) {
                sum += rowDensities[j];
                count++;
            }
            smoothed.push(sum / count);
        }

        // Find peaks and valleys
        // We'll print out simplified ASCII graph
        console.log('Density Profile (every 10th row):');
        for (let i = 0; i < smoothed.length; i += 10) {
            const bar = '#'.repeat(Math.min(50, Math.floor(smoothed[i] / 20)));
            console.log(`${i}: ${bar} (${Math.floor(smoothed[i])})`);
        }

    } catch (error) {
        console.error('Error profiling density:', error);
    }
}

profileDensity();
