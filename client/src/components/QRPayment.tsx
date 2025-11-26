import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, QrCode, Building, CreditCard, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format-price';
// @ts-ignore - Package has no TypeScript types
import generateEPCQrCode from 'sepa-payment-qr-code';
import QRCode from 'qrcode';

interface QRPaymentProps {
  salesOrderId: string;
  paymentMode: 'full' | 'deposit';
  amount: number;
  currency?: string;
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
  isLoading?: boolean;
  showSubmitButton?: boolean; // Optional prop to show/hide submit button
}

export default function QRPayment({ 
  salesOrderId,
  paymentMode,
  amount, 
  currency = 'EUR',
  onSuccess, 
  onError, 
  isLoading = false,
  showSubmitButton = true
}: QRPaymentProps) {
  const { toast } = useToast();
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [generatedQRCode, setGeneratedQRCode] = useState<string | null>(null);

  // Fetch QR payment details from ERPNext ONLY - no fallbacks
  const { data: qrPaymentData, isLoading: qrLoading, error: qrError } = useQuery({
    queryKey: ['/api/qr-payment', salesOrderId],
    queryFn: async () => {
      const response = await fetch(`/api/qr-payment/${salesOrderId}`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('QR Payment API endpoint not available on this server');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!salesOrderId,
    staleTime: 300000, // 5 minutes cache
    retry: 1 // Reduced retries since we don't want fallbacks
  });

  useEffect(() => {
    if (qrError) {
      onError(qrError);
    }
  }, [qrError, onError]);

  // IBAN validation function
  const validateSlovakIBAN = (iban: string): boolean => {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    if (cleanIban.length !== 24 || !cleanIban.startsWith('SK')) {
      return false;
    }
    
    // Rearrange: move first 4 chars to end
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    let numeric = '';
    
    // Convert letters to numbers (A=10, B=11, ..., Z=35)
    for (let char of rearranged) {
      if (/[A-Z]/.test(char)) {
        numeric += (char.charCodeAt(0) - 55).toString();
      } else {
        numeric += char;
      }
    }
    
    // MOD97 calculation
    let remainder = 0;
    for (let digit of numeric) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }
    
    return remainder === 1;
  };

  // Generate EPC QR code for European payments
  const generateEPCQRCode = async (paymentData: any) => {
    try {
      // Prepare payment data for EPC format
      let cleanIban = paymentData.iban?.replace(/\s/g, '') || '';
      const variableSymbol = paymentData.variable_symbol || salesOrderId;
      
      // Check if provided IBAN is valid, if not use the correct IBAN
      if (!cleanIban || !validateSlovakIBAN(cleanIban)) {
        console.warn(`Invalid IBAN provided (${cleanIban}), using configured IBAN for EPC QR code generation`);
        cleanIban = 'SK7611000000002928904436';
      }
      
      // Debug logging
      console.log('EPC QR Code generation debug:', {
        originalIban: paymentData.iban,
        cleanIban: cleanIban,
        isValid: validateSlovakIBAN(cleanIban),
        ibanLength: cleanIban.length,
        variableSymbol,
        amount,
        beneficiary: paymentData.company_name
      });

      // Validate IBAN format (Slovak IBAN should be 24 characters, starting with SK)
      if (!cleanIban.startsWith('SK') || cleanIban.length !== 24) {
        throw new Error(`Invalid Slovak IBAN format: ${cleanIban} (length: ${cleanIban.length})`);
      }
      
      // Generate EPC QR code content
      const epcQrText = generateEPCQrCode({
        name: paymentData.company_name || 'DEMO - Glam cake s. r. o.',
        iban: cleanIban,
        amount: amount,
        unstructuredReference: `Objednavka ${variableSymbol}`,
        information: 'Marsela Bakery - Platba za objednavku'
      });

      // Generate QR code image from the EPC text
      const qrCodeDataURL = await QRCode.toDataURL(epcQrText, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M'
      });

      setGeneratedQRCode(qrCodeDataURL);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating EPC QR code:', error);
      toast({
        title: 'Chyba pri generovaní QR kódu',
        description: 'Nepodarilo sa vygenerovať QR kód pre platbu',
        variant: 'destructive'
      });
      return null;
    }
  };

  // Generate QR code when payment data becomes available
  useEffect(() => {
    if (qrPaymentData?.data && !qrPaymentData.data.qr_code && !generatedQRCode) {
      generateEPCQRCode(qrPaymentData.data);
    }
  }, [qrPaymentData, amount, salesOrderId, generatedQRCode]);

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStates(prev => ({ ...prev, [field]: true }));
      
      toast({
        title: "Skopírované",
        description: "Text bol skopírovaný do schránky",
        duration: 2000
      });

      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [field]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa skopírovať do schránky",
        variant: "destructive"
      });
    }
  };

  const handleSubmitPayment = async () => {
    try {
      setPaymentSubmitted(true);
      
      // For bank transfer, we just mark as submitted locally
      // The actual payment confirmation will be done by the bakery staff
      onSuccess({
        payment_method: 'bank_transfer',
        status: 'submitted',
        salesOrderId,
        paymentMode,
        amount
      });

      toast({
        title: "Objednávka odoslaná",
        description: "Vykonajte platbu podľa uvedených pokynov. Objednávka bude potvrdená po prijatí platby.",
        duration: 5000
      });
    } catch (error) {
      console.error('Error submitting bank transfer payment:', error);
      onError(error);
      setPaymentSubmitted(false);
    }
  };

  const isButtonDisabled = isLoading || qrLoading || paymentSubmitted;

  if (qrLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Platba bankovým prevodom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-3">Načítavanie platobných údajov...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (qrError || !qrPaymentData || !qrPaymentData.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Platba bankovým prevodom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-red-600 mb-4">
              Nepodarilo sa načítať platobné údaje z ERPNext systému.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {qrError?.message || 'Platobné údaje sa musia načítať z ERPNext systému.'}
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Kontaktujte nás pre dokončenie objednávky:</p>
              <p>Email: marsela@bakery.sk</p>
              <p>Telefón: +421 123 456 789</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { qr_code, iban, company_name, variable_symbol } = qrPaymentData?.data || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Platba bankovým prevodom
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Naskenujte QR kód v mobilnej bankovej aplikácii alebo použite údaje uvedené nižšie
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Suma na úhradu:</span>
            <span className="text-xl font-bold text-primary">{formatPrice(amount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Objednávka:</span>
            <span>{salesOrderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Typ platby:</span>
            <span>{paymentMode === 'full' ? 'Celková platba' : 'Záloha (50%)'}</span>
          </div>
        </div>

        {/* QR Code Section - Always show QR code */}
        <div className="text-center">
          <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
            {qr_code ? (
              <img 
                src={qr_code} 
                alt="QR kód pre platbu" 
                className="w-48 h-48 object-contain"
                data-testid="img-qr-code"
              />
            ) : generatedQRCode ? (
              <img 
                src={generatedQRCode} 
                alt="EPC QR kód pre platbu" 
                className="w-48 h-48 object-contain"
                data-testid="img-generated-qr-code"
              />
            ) : (
              // Loading or fallback state
              <div className="w-48 h-48 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded">
                <div className="text-center">
                  {qrLoading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                      <p className="text-xs text-gray-500">Generuje sa QR kód...</p>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Použite údaje nižšie</p>
                      <p className="text-xs text-gray-400 mt-1">pre manuálny prevod</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-2 space-y-1">
            <p>
              {qr_code || generatedQRCode ? 'Naskenujte QR kód v mobilnej bankovej aplikácii' : 'Použite platobné údaje uvedené nižšie pre manuálny prevod'}
            </p>
            {generatedQRCode && !qr_code && (
              <p className="text-xs text-green-600 font-medium">
                ✓ QR kód vygenerovaný podľa európskeho štandardu EPC
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Building className="h-4 w-4" />
            Platobné údaje
          </h3>
          
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Príjemca:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium" data-testid="text-company-name">{company_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(company_name, 'company')}
                  data-testid="button-copy-company"
                >
                  {copyStates.company ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">IBAN:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono" data-testid="text-iban">{iban}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(iban, 'iban')}
                  data-testid="button-copy-iban"
                >
                  {copyStates.iban ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Variabilný symbol:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono" data-testid="text-variable-symbol">{variable_symbol}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(variable_symbol, 'vs')}
                  data-testid="button-copy-vs"
                >
                  {copyStates.vs ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Suma:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary" data-testid="text-amount">{formatPrice(amount)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(amount.toFixed(2), 'amount')}
                  data-testid="button-copy-amount"
                >
                  {copyStates.amount ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Pokyny pre platbu:</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Naskenujte QR kód v mobilnej bankovej aplikácii ALEBO</li>
            <li>• Vykonajte bankový prevod s uvedenými údajmi</li>
            <li>• Uistite sa, že uvediete správny variabilný symbol</li>
            <li>• Objednávka bude potvrdená po prijatí platby na účet</li>
          </ul>
        </div>

        {/* Submit Button - Only show if showSubmitButton is true */}
        {showSubmitButton && (
          <>
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSubmitPayment}
          disabled={isButtonDisabled}
          data-testid="button-submit-payment"
        >
          {isButtonDisabled ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {paymentSubmitted ? 'Objednávka odoslaná' : 'Spracúvam...'}
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Potvrdiť objednávku
            </>
          )}
        </Button>

        {paymentSubmitted && (
          <div className="text-center text-sm text-muted-foreground">
            <p>✅ Objednávka bola úspešne odoslaná</p>
            <p>Vykonajte platbu podľa pokynov vyššie</p>
          </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}