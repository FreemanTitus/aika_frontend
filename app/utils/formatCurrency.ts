// utils/formatCurrency.ts  (auto-imported by Nuxt)
export const formatCurrency = (value: any): string => {
  const num = parseFloat(value)
  return isNaN(num)
    ? '₦0'
    : `₦${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
