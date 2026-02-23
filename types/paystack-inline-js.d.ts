declare module "@paystack/inline-js" {
  type TransactionConfig = {
    key: string
    email: string
    amount: number
    currency?: string
    ref?: string
    metadata?: Record<string, unknown>
    onSuccess?: (transaction: { reference?: string }) => void
    onCancel?: () => void
    [key: string]: unknown
  }

  export default class PaystackPop {
    newTransaction(config: TransactionConfig): void
  }
}
