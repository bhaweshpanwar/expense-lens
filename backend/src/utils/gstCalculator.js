/**
 * GST Utility Math Engine
 * Handles deterministic tax calculations for Indian MSME context
 */

const BLOCKED_ITC_CATEGORIES = [
  'Food & Beverages',
  'Personal Care',
  'Club Memberships',
  'Motor Vehicles (Personal)'
];

/**
 * Calculates GST breakdown based on total amount and rate
 * @param {Object} params
 * @param {number} params.totalAmount - Total invoice value
 * @param {number} params.gstRate - GST rate (0, 5, 12, 18, 28)
 * @param {boolean} [params.isTaxInclusive=true] - Whether totalAmount includes tax
 * @param {boolean} [params.isInterState=false] - True if IGST applies
 * @param {string} [params.categoryName=''] - Category for ITC eligibility check
 * @returns {Object} { taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, itc_eligible }
 */
const calculateGst = ({
  totalAmount,
  gstRate,
  isTaxInclusive = true,
  isInterState = false,
  categoryName = ''
}) => {
  let taxable;
  let totalTax;

  if (isTaxInclusive) {
    taxable = totalAmount / (1 + gstRate / 100);
    totalTax = totalAmount - taxable;
  } else {
    taxable = totalAmount;
    totalTax = totalAmount * (gstRate / 100);
  }

  let cgst = 0, sgst = 0, igst = 0;

  if (isInterState) {
    igst = totalTax;
  } else {
    cgst = totalTax / 2;
    sgst = totalTax / 2;
  }

  const itc_eligible = !BLOCKED_ITC_CATEGORIES.includes(categoryName);

  // Round to 2 decimal places to avoid floating point issues in DB
  const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  return {
    taxable_amount: round(taxable),
    cgst_amount: round(cgst),
    sgst_amount: round(sgst),
    igst_amount: round(igst),
    total_amount: round(isTaxInclusive ? totalAmount : taxable + totalTax),
    itc_eligible
  };
};

/**
 * Validates Indian GSTIN format
 * Pattern: 2 digits (state), 5 chars (PAN), 4 digits, 1 char, 1 char (Z/etc), 1 char
 * @param {string} gstin
 * @returns {boolean}
 */
const isValidGstin = (gstin) => {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin);
};

module.exports = {
  calculateGst,
  isValidGstin
};
