
import { toUSDate, toDBDate, excelSerialToDBDate } from '../lib/dateUtils.js';

// Mocking the browser/environment timezone is tricky in node directly for Date objects 
// without changing the process.env.TZ before the process starts.
// However, our utilities are designed to be string-based or UTC-based.

console.log("--- Timezone Verification Test ---");

const testDates = [
    "2025-11-18",
    "2025-11-18T00:00:00.000Z",
    "2025-11-18T00:00:00-05:00", // EST midnight
    new Date("2025-11-18T00:00:00Z"),
];

console.log(`\nCurrent System Timezone Offset: ${new Date().getTimezoneOffset()} minutes (positive is behind UTC, negative is ahead)`);

console.log("\nTesting toUSDate() - Should ALWAYS be 11/18/2025");
testDates.forEach(date => {
    const result = toUSDate(date);
    const status = result === "11/18/2025" ? "✅ PASS" : "❌ FAIL";
    console.log(`Input: ${typeof date === 'object' ? date.toISOString() : date} -> Output: ${result} ${status}`);
});

console.log("\nTesting toDBDate() - Should ALWAYS be 2025-11-18");
testDates.forEach(date => {
    const result = toDBDate(date);
    const status = result === "2025-11-18" ? "✅ PASS" : "❌ FAIL";
    console.log(`Input: ${typeof date === 'object' ? date.toISOString() : date} -> Output: ${result} ${status}`);
});
