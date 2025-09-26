import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, QrCode, Building, CreditCard, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format-price';

interface QRPaymentProps {
  salesOrderId: string;
  paymentMode: 'full' | 'deposit';
  amount: number;
  currency?: string;
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
  isLoading?: boolean;
}

export default function QRPayment({ 
  salesOrderId,
  paymentMode,
  amount, 
  currency = 'EUR',
  onSuccess, 
  onError, 
  isLoading = false
}: QRPaymentProps) {
  const { toast } = useToast();
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});

  // Fetch QR payment details from ERPNext
  const { data: qrPaymentData, isLoading: qrLoading, error: qrError } = useQuery({
    queryKey: ['/api/qr-payment', salesOrderId],
    enabled: !!salesOrderId,
    staleTime: 300000, // 5 minutes cache
    retry: 3
  });

  useEffect(() => {
    if (qrError) {
      onError(qrError);
    }
  }, [qrError, onError]);

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
              Nepodarilo sa načítať platobné údaje. Prosím kontaktujte nás.
            </p>
            <div className="text-sm text-muted-foreground">
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
        <CardTitle className="flex items-center gap-2">
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

        {/* QR Code Section */}
        {qr_code && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
              <img 
                src={qr_code} 
                alt="QR kód pre platbu" 
                className="w-48 h-48 object-contain"
                data-testid="img-qr-code"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Naskenujte QR kód v mobilnej bankovej aplikácii
            </p>
          </div>
        )}

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

        {/* Submit Button */}
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
      </CardContent>
    </Card>
  );
}