// Constantes para taxas do Stripe (Cartão USD)
const STRIPE_PERCENTAGE = 0.039; // 3.9%
const STRIPE_FIXED_FEE = 0.30;   // $0.30

/**
 * Calcula o valor bruto (gross amount) que deve ser cobrado do cliente
 * para garantir que o valor líquido desejado seja recebido após as taxas do Stripe.
 * 
 * @param netAmount - Valor líquido desejado em USD (ex: 100.00)
 * @returns Valor bruto em centavos (ex: 10427 = $104.27)
 */
export function calculateCardAmountWithFees(netAmount: number): number {
  // Validar entrada
  if (netAmount <= 0) {
    throw new Error('Valor líquido deve ser maior que zero');
  }

  // Fórmula: (Valor líquido + Taxa fixa) / (1 - Taxa percentual)
  const grossAmount = (netAmount + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE);

  // Arredondar para 2 casas decimais e converter para centavos
  const grossAmountRounded = Math.round(grossAmount * 100) / 100;
  const grossAmountInCents = Math.round(grossAmountRounded * 100);

  return grossAmountInCents;
}

/**
 * Calcula o valor da taxa do Stripe baseado no valor bruto cobrado.
 * 
 * @param grossAmount - Valor bruto em USD (ex: 104.27)
 * @returns Valor da taxa em USD (ex: 4.27)
 */
export function calculateCardFee(grossAmount: number): number {
  // Taxa = (Valor bruto × Taxa percentual) + Taxa fixa
  const feeAmount = (grossAmount * STRIPE_PERCENTAGE) + STRIPE_FIXED_FEE;
  
  // Arredondar para 2 casas decimais
  return Math.round(feeAmount * 100) / 100;
}

/**
 * Valida se o valor líquido recebido após as taxas está correto.
 * 
 * @param grossAmount - Valor bruto cobrado em USD
 * @param expectedNetAmount - Valor líquido esperado em USD
 * @returns true se o valor líquido está correto (com tolerância de 1 centavo)
 */
export function validateNetAmount(grossAmount: number, expectedNetAmount: number): boolean {
  const actualFee = calculateCardFee(grossAmount);
  const actualNetAmount = grossAmount - actualFee;
  const difference = Math.abs(actualNetAmount - expectedNetAmount);
  
  // Tolerância de 1 centavo para arredondamentos
  return difference <= 0.01;
}

