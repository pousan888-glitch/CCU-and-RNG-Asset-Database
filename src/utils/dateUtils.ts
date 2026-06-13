/**
 * Utility functions for timezone-safe handling and formatting of dates,
 * including robust support for Excel serial dates (e.g., 45920 or similar format strings).
 */

export function parseDate(dateVal: string | number | null | undefined): Date | null {
  if (dateVal === null || dateVal === undefined) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Check if it's an Excel serial date number
  if (/^\d+(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    // Excel serial number represents days since 1900-01-01.
    // Safe standard Excel serial date range covering years ~1980 to 2100.
    if (serial > 25000 && serial < 80000) {
      const utc_days = serial - 25569;
      // Multiply by 86400 seconds * 1000 ms, keeping it strictly in UTC hours (midday 12:00 UTC to avoid timezone boundary issues)
      const ms = (utc_days * 86400) * 1000 + (12 * 60 * 60 * 1000); 
      const date = new Date(ms);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Check standard parsing
  let date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try parsing dd/mm/yyyy or dd-mm-yyyy or similar
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      if (p3 > 1000) { // dd/mm/yyyy format
        // Create date in UTC midday to avoid timezone boundary shifts
        const d = new Date(Date.UTC(p3, p2 - 1, p1, 12, 0, 0));
        if (!isNaN(d.getTime())) return d;
      } else if (p1 > 1000) { // yyyy/mm/dd format
        const d = new Date(Date.UTC(p1, p2 - 1, p3, 12, 0, 0));
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

/**
 * Formats a given date source into "DD/MM/YYYY" format.
 * Defaults back to the raw string if parsing is completely un-executable.
 */
export function displayDate(dateStr: string | number | null | undefined): string {
  if (!dateStr) return "-";
  const parsed = parseDate(dateStr);
  if (!parsed || isNaN(parsed.getTime())) return String(dateStr);
  
  const d = String(parsed.getUTCDate()).padStart(2, '0');
  const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const y = parsed.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Get the calculated expiry date (Certification Date + 1 Year).
 */
export function getExpiryDate(certDateStr: string | number | null | undefined): Date | null {
  const parsed = parseDate(certDateStr);
  if (!parsed) return null;
  const expiry = new Date(parsed.getTime());
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
  return expiry;
}

/**
 * Formats the calculated expiration date into "DD/MM/YYYY".
 */
export function displayExpiryDate(certDateStr: string | number | null | undefined): string {
  const expiry = getExpiryDate(certDateStr);
  if (!expiry) return "-";
  const d = String(expiry.getUTCDate()).padStart(2, '0');
  const m = String(expiry.getUTCMonth() + 1).padStart(2, '0');
  const y = expiry.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Calculates remaining days from Today until the calculated Expiry Date.
 */
export function getRemainingDays(
  certDateStr: string | number | null | undefined,
  todayStrOrMs: string | number = "2026-06-10"
): number | null {
  if (!certDateStr) return null;
  const expiry = getExpiryDate(certDateStr);
  if (!expiry) return null;
  
  const todayMs = typeof todayStrOrMs === "number" ? todayStrOrMs : new Date(todayStrOrMs).getTime();
  const expiryMs = expiry.getTime();
  
  const diffMs = expiryMs - todayMs;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines standard alert status: "valid" | "warning" | "expired"
 * - Expires in <= 0 days: "expired"
 * - Expires in <= 45 days: "warning"
 * - Otherwise: "valid"
 */
export function checkCertExpiryStatus(
  certDateStr: string | number | null | undefined,
  todayStrOrMs: string | number = "2026-06-10"
): "valid" | "warning" | "expired" {
  if (!certDateStr) return "valid";
  const expiry = getExpiryDate(certDateStr);
  if (!expiry) return "valid";
  
  const todayMs = typeof todayStrOrMs === "number" ? todayStrOrMs : new Date(todayStrOrMs).getTime();
  const expiryMs = expiry.getTime();
  
  const diffMs = expiryMs - todayMs;
  
  if (diffMs < 0) {
    return "expired";
  }
  
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 45) {
    return "warning";
  }
  
  return "valid";
}

/**
 * Get timestamp in ms safe for comparison (midday Unix epoch)
 */
export function getDateMs(dateStr: string | number | null | undefined): number {
  if (!dateStr) return 0;
  const parsed = parseDate(dateStr);
  return parsed ? parsed.getTime() : 0;
}

/**
 * Custom sorting for asset areas/zones to place "Local FZ" next to "FREE ZONE"
 */
export function sortAreas(areas: string[]): string[] {
  const getSortKey = (area: string) => {
    const norm = area.trim().toUpperCase();
    if (norm === "LOCAL FZ") {
      return "FREE ZONE_A_LOCAL FZ";
    }
    return norm;
  };

  return [...areas].sort((a, b) => {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);
    return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
  });
}

