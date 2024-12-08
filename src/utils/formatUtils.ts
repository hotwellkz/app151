export const formatAmount = (amount: number): string => {
  const absAmount = Math.abs(amount);
  return absAmount.toLocaleString('ru-RU') + ' ₸';
};