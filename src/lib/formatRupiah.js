/**
 * Format angka ke format Rupiah Indonesia.
 * Contoh: 1500000 → "Rp 1.500.000"
 */
export function formatRupiah(value) {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
