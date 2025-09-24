import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format-price';

// Initialize Stripe (optional for development)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface StripeCheckoutFormProps {
  salesOrderId: string;
  paymentMode: 'full' | 'deposit';
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: any) => void;
  isLoading?: boolean;
}

function StripeCheckoutForm({ 
  salesOrderId,
  paymentMode,
  amount, 
  currency = 'eur',
  onSuccess, 
  onError, 
  isLoading = false
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || processing) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?salesOrderId=${salesOrderId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        onError(error);
        toast({
          title: "Chyba platby",
          description: error.message || "Nastala chyba pri spracovaní platby",
          variant: "destructive",
        });
      } else {
        // Payment succeeded
        toast({
          title: "Platba úspešná",
          description: "Vaša platba bola úspešne spracovaná",
        });
        onSuccess({ salesOrderId, paymentMode, amount, currency });
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      onError(error);
      toast({
        title: "Chyba platby",
        description: "Nastala neočakávaná chyba pri spracovaní platby",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Platba kartou
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Suma k úhrade:</p>
            <p className="text-xl font-semibold" data-testid="text-payment-amount">
              {formatPrice(amount)}
            </p>
          </div>
          
          <PaymentElement
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  name: '',
                  email: '',
                }
              }
            }}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || !elements || processing || isLoading}
            data-testid="button-pay-now"
          >
            {processing || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Spracúvam platbu...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Zaplatiť {formatPrice(amount)}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface StripeCheckoutProps {
  salesOrderId: string;
  paymentMode: 'full' | 'deposit';
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: any) => void;
}

export default function StripeCheckout({
  salesOrderId,
  paymentMode,
  amount,
  currency = 'eur',
  onSuccess,
  onError
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create PaymentIntent when component mounts
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          salesOrderId,
          paymentMode,
          currency
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create payment intent');
        }
        
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error('Error creating payment intent:', error);
        onError(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (salesOrderId) {
      createPaymentIntent();
    }
  }, [salesOrderId, paymentMode, currency]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Pripravujem platbu...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if Stripe is configured
  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Platby kartou nie sú dostupné</p>
            <p className="text-sm mt-2">Platobný systém nie je nakonfigurovaný.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <p>Nepodarilo sa pripojiť k platobnému systému.</p>
            <p className="text-sm mt-2">Skúste obnoviť stránku.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#a78d6b',
          },
        },
      }}
    >
      <StripeCheckoutForm
        salesOrderId={salesOrderId}
        paymentMode={paymentMode}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
        isLoading={isLoading}
      />
    </Elements>
  );
}