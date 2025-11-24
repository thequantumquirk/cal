/**
 * Timezone-agnostic date utilities for US clients
 * 
 * Core Principle: Treat all dates as calendar dates (YYYY-MM-DD) without time components.
 * This prevents timezone conversion issues where dates shift by one day.
 * 
 * @module dateUtils
 */

/**
 * Convert any date input to YYYY-MM-DD format (for database storage and date inputs)
 * 
 * @param {Date|string|number} date - Date input in various formats
 * @returns {string|null} Date in YYYY-MM-DD format, or null if invalid
 * 
 * @example
 * toDBDate('11/18/2025') // '2025-11-18'
 * toDBDate(new Date('2025-11-18')) // '2025-11-18'
 * toDBDate('2025-11-18') // '2025-11-18'
 */
export function toDBDate(date) {
    if (!date) return null;

    // If already in YYYY-MM-DD format, return as-is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    // If MM/DD/YYYY format, convert to YYYY-MM-DD
    if (typeof date === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
        const [month, day, year] = date.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // If M/D/YY format (2-digit year), convert to YYYY-MM-DD
    if (typeof date === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(date)) {
        const [month, day, year] = date.split('/');
        const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // If ISO timestamp (YYYY-MM-DDTHH:MM:SS), extract date part
    if (typeof date === 'string' && date.includes('T')) {
        const [datePart] = date.split('T');
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }
    }

    // If Date object, use UTC methods to avoid timezone shifts
    if (date instanceof Date && !isNaN(date)) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Fallback: try parsing as Date
    const d = new Date(date);
    if (!isNaN(d)) {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

/**
 * Convert date to MM/DD/YYYY format (US display format)
 * 
 * @param {Date|string} date - Date input in various formats
 * @returns {string} Date in MM/DD/YYYY format, or empty string if invalid
 * 
 * @example
 * toUSDate('2025-11-18') // '11/18/2025'
 * toUSDate(new Date('2025-11-18')) // '11/18/2025'
 * toUSDate('11/18/2025') // '11/18/2025'
 */
export function toUSDate(date) {
    if (!date) return '';

    // If already in MM/DD/YYYY format, return as-is
    if (typeof date === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
        return date;
    }

    // If YYYY-MM-DD format, convert to MM/DD/YYYY
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${parseInt(month)}/${parseInt(day)}/${year}`;
    }

    // If ISO timestamp, extract date part and convert
    if (typeof date === 'string' && date.includes('T')) {
        const [datePart] = date.split('T');
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            const [year, month, day] = datePart.split('-');
            return `${parseInt(month)}/${parseInt(day)}/${year}`;
        }
    }

    // If Date object, use UTC methods to avoid timezone shifts
    if (date instanceof Date && !isNaN(date)) {
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        return `${month}/${day}/${year}`;
    }

    return '';
}

/**
 * Get today's date in YYYY-MM-DD format (for date inputs)
 * Uses local date to match user's calendar day
 * 
 * @returns {string} Today's date in YYYY-MM-DD format
 * 
 * @example
 * getTodayDBDate() // '2025-11-23'
 */
export function getTodayDBDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date in MM/DD/YYYY format (for US display)
 * 
 * @returns {string} Today's date in MM/DD/YYYY format
 * 
 * @example
 * getTodayUSDate() // '11/23/2025'
 */
export function getTodayUSDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Parse Excel serial date to YYYY-MM-DD format
 * Excel stores dates as number of days since 1900-01-01
 * 
 * @param {number} serial - Excel serial date number
 * @returns {string|null} Date in YYYY-MM-DD format, or null if invalid
 * 
 * @example
 * excelSerialToDBDate(45612) // '2024-11-18'
 */
export function excelSerialToDBDate(serial) {
    if (serial == null || serial === "") return null;
    if (typeof serial !== 'number' || isNaN(serial)) return null;

    try {
        // Excel date calculation (days since 1900-01-01)
        // Note: 25569 is the number of days between 1900-01-01 and 1970-01-01 (Unix epoch)
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400; // Convert to seconds
        const d = new Date(utc_value * 1000); // Convert to milliseconds

        const year = d.getUTCFullYear();

        // Validate year is reasonable
        if (year < 1900 || year > new Date().getFullYear() + 10) {
            return null;
        }

        return toDBDate(d);
    } catch (err) {
        console.error('Error parsing Excel serial date:', err);
        return null;
    }
}

/**
 * Validate if a date string is valid
 * 
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date, false otherwise
 * 
 * @example
 * isValidDate('2025-11-18') // true
 * isValidDate('invalid') // false
 */
export function isValidDate(dateString) {
    if (!dateString) return false;

    const dbDate = toDBDate(dateString);
    if (!dbDate) return false;

    const date = new Date(dbDate);
    return date instanceof Date && !isNaN(date);
}

/**
 * Compare two dates (returns -1, 0, or 1)
 * Useful for sorting
 * 
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 * 
 * @example
 * compareDates('2025-11-18', '2025-11-19') // -1
 * compareDates('2025-11-18', '2025-11-18') // 0
 * compareDates('2025-11-19', '2025-11-18') // 1
 */
export function compareDates(date1, date2) {
    const d1 = toDBDate(date1);
    const d2 = toDBDate(date2);

    if (!d1 || !d2) return 0;

    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
}

/**
 * Format date for display with custom format
 * 
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string ('US' or 'DB')
 * @returns {string} Formatted date
 * 
 * @example
 * formatDate('2025-11-18', 'US') // '11/18/2025'
 * formatDate('11/18/2025', 'DB') // '2025-11-18'
 */
export function formatDate(date, format = 'US') {
    if (format === 'US') {
        return toUSDate(date);
    } else if (format === 'DB') {
        return toDBDate(date);
    }
    return toUSDate(date);
}

/**
 * Parse date from HTML date input (YYYY-MM-DD) to display format
 * This is specifically for handling <input type="date"> values
 * 
 * @param {string} inputValue - Value from date input (YYYY-MM-DD)
 * @returns {string} Date in YYYY-MM-DD format (no conversion needed)
 */
export function parseDateInput(inputValue) {
    // HTML date inputs always return YYYY-MM-DD format
    // We keep it in this format for consistency
    return toDBDate(inputValue);
}

/**
 * Get date range for filtering
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Object with start and end dates
 */
export function getDateRange(startDate, endDate) {
    return {
        start: toDBDate(startDate),
        end: toDBDate(endDate),
    };
}
