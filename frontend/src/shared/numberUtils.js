export function sanitizeGrowthInput(rawValue, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;

  if (rawValue === null || rawValue === undefined) {
    return { value: null, valid: false, message: 'Enter a valid numeric value.' };
  }

  const raw = String(rawValue).trim();
  if (raw === '') {
    return { value: null, valid: false, message: 'Enter a valid numeric value.' };
  }

  const normalized = raw.replace(/,/g, '');
  if (!/^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(normalized)) {
    return { value: null, valid: false, message: 'Enter a valid numeric value.' };
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    return { value: null, valid: false, message: 'Value is out of range.' };
  }

  if (numericValue < min || numericValue > max) {
    return { value: null, valid: false, message: `Value must be between ${min} and ${max}.` };
  }

  return { value: numericValue, valid: true, message: null };
}
