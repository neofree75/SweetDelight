declare module 'sepa-payment-qr-code' {
  interface EPCPaymentData {
    name: string;
    iban: string;
    amount: number;
    unstructuredReference?: string;
    information?: string;
  }
  
  function generateEPCQrCode(data: EPCPaymentData): string;
  
  export = generateEPCQrCode;
}