import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format-price';
import { CheckCircle2, PackageOpen, Info, AlertTriangle } from 'lucide-react';

interface WithdrawalProps {
  user?: { email: string; name: string } | null;
}

interface LookupItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
}

interface LookupResult {
  orderId: string;
  transactionDate?: string;
  deliveryDate?: string;
  grandTotal?: number;
  currency: string;
  remainingDays: number;
  periodStarted?: boolean;
  items: LookupItem[];
}

type Step = 'lookup' | 'select' | 'done';

export default function Withdrawal({ user }: WithdrawalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('lookup');

  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<LookupResult | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [fullName, setFullName] = useState(user?.name || '');
  const [iban, setIban] = useState('');
  const [reason, setReason] = useState('');
  const [requestId, setRequestId] = useState<string | undefined>();

  // Predvyplň číslo objednávky z URL (?orderId=) – napr. preklik z detailu objednávky
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlOrderId = params.get('orderId');
    if (urlOrderId) setOrderId(urlOrderId);
    const urlEmail = params.get('email');
    if (urlEmail) setEmail(urlEmail);
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/withdrawal/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Objednávku sa nepodarilo overiť.');
        return;
      }
      setOrder(data);
      // Predvolene zaškrtnúť všetky položky (odstúpenie od celej objednávky)
      const init: Record<string, boolean> = {};
      (data.items || []).forEach((it: LookupItem, idx: number) => {
        init[`${it.item_code}-${idx}`] = true;
      });
      setSelected(init);
      setStep('select');
    } catch (err) {
      setError('Nastala chyba. Skúste to znova neskôr.');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedItems = (order?.items || []).filter(
    (it, idx) => selected[`${it.item_code}-${idx}`]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedItems.length === 0) {
      setError('Vyberte aspoň jednu položku, od ktorej chcete odstúpiť.');
      return;
    }
    if (fullName.trim().length < 2) {
      setError('Zadajte meno a priezvisko.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/withdrawal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order!.orderId,
          email: email.trim(),
          fullName: fullName.trim(),
          iban: iban.trim() || undefined,
          reason: reason.trim() || undefined,
          items: selectedItems.map((it) => ({
            item_code: it.item_code,
            item_name: it.item_name,
            qty: it.qty,
            rate: it.rate,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Požiadavku sa nepodarilo odoslať.');
        return;
      }
      setRequestId(data.requestId);
      setStep('done');
      toast({
        title: 'Odstúpenie zaregistrované',
        description: 'Potvrdenie sme odoslali na váš e-mail.',
      });
    } catch (err) {
      setError('Nastala chyba. Skúste to znova neskôr.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Helmet>
        <title>Odstúpenie od zmluvy | Sweet Delight</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-playfair mb-2">Odstúpenie od zmluvy</h1>
        <p className="text-muted-foreground">
          Tovar zakúpený online môžete vrátiť do 14 dní bez udania dôvodu.
          Vyplňte formulár nižšie – potvrdenie vám pošleme e-mailom.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KROK 1 – overenie objednávky */}
      {step === 'lookup' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Overenie objednávky</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Číslo objednávky</Label>
                <Input
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="napr. SAL-ORD-2026-00123"
                  required
                  data-testid="input-withdrawal-orderId"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail z objednávky</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.sk"
                  required
                  data-testid="input-withdrawal-email"
                />
              </div>
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                Na overenie nepotrebujete prihlásenie – stačí číslo objednávky a
                e-mail, na ktorý ste objednávku zadali.
              </p>
              <Button type="submit" disabled={loading} data-testid="button-withdrawal-lookup">
                {loading ? 'Overujem…' : 'Pokračovať'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* KROK 2 – výber položiek a odoslanie */}
      {step === 'select' && order && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <PackageOpen className="h-5 w-5" />
                Objednávka {order.orderId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.periodStarted === false ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    14-dňová lehota na odstúpenie začne plynúť až po doručení tovaru
                    {order.deliveryDate
                      ? ` (${new Date(order.deliveryDate).toLocaleDateString('sk-SK')})`
                      : ''}
                    . Od zmluvy môžete odstúpiť aj teraz, ešte pred doručením.
                  </AlertDescription>
                </Alert>
              ) : order.remainingDays >= 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Na odstúpenie od zmluvy vám zostáva{' '}
                    <strong>{order.remainingDays} dní</strong> (14-dňová lehota).
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    14-dňová lehota na odstúpenie už pravdepodobne uplynula.
                    Požiadavku môžete odoslať, posúdime ju individuálne.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="mb-2 block">Vyberte položky na vrátenie</Label>
                <div className="space-y-2">
                  {order.items.map((it, idx) => {
                    const key = `${it.item_code}-${idx}`;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-md bg-muted/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={!!selected[key]}
                          onCheckedChange={() => toggleItem(key)}
                          data-testid={`checkbox-withdrawal-item-${idx}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{it.item_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Kód: {it.item_code} · {it.qty} ks
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {formatPrice(it.rate * it.qty)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Vaše údaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Meno a priezvisko</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  data-testid="input-withdrawal-fullName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN na vrátenie peňazí (nepovinné)</Label>
                <Input
                  id="iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="SK00 0000 0000 0000 0000 0000"
                  data-testid="input-withdrawal-iban"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Dôvod (nepovinné)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Pri odstúpení od zmluvy nemusíte uvádzať dôvod."
                  data-testid="input-withdrawal-reason"
                />
              </div>
              <Separator />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('lookup')}
                  data-testid="button-withdrawal-back"
                >
                  Späť
                </Button>
                <Button type="submit" disabled={loading} data-testid="button-withdrawal-submit">
                  {loading ? 'Odosielam…' : 'Odoslať odstúpenie od zmluvy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* KROK 3 – potvrdenie */}
      {step === 'done' && (
        <Card>
          <CardContent className="text-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-serif mb-2">Odstúpenie zaregistrované</h2>
            <p className="text-muted-foreground mb-2">
              Vašu žiadosť o odstúpenie od zmluvy sme zaevidovali
              {requestId ? ` pod číslom ${requestId}` : ''}.
            </p>
            <p className="text-muted-foreground">
              Potvrdenie sme odoslali na e-mail <strong>{email}</strong>. O ďalšom
              postupe vás budeme informovať.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
