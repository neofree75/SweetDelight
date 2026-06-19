import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/format-price";
import { FileMinus, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { UserOrder } from "@shared/schema";

interface WithdrawalDialogProps {
  order: UserOrder;
  customerEmail?: string;
  customerName?: string;
}

// Zostávajúce dni 14-dňovej lehoty (rovnaká logika ako server withdrawalRemainingDays).
// Lehota začína plynúť až prevzatím tovaru – ak doručenie ešte len bude, periodStarted = false.
function remainingWithdrawalDays(order: UserOrder): {
  remainingDays: number;
  periodStarted: boolean;
} {
  const base = order.deliveryDate || order.transactionDate;
  if (!base) return { remainingDays: 0, periodStarted: true };
  const msPerDay = 1000 * 60 * 60 * 24;
  const deadline = new Date(base);
  deadline.setDate(deadline.getDate() + 14);
  return {
    remainingDays: Math.ceil((deadline.getTime() - Date.now()) / msPerDay),
    periodStarted: new Date(base).getTime() <= Date.now(),
  };
}

function formatSkDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sk-SK");
}

export function WithdrawalDialog({ order, customerEmail, customerName }: WithdrawalDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>();

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    order.items.forEach((it, idx) => {
      init[`${it.itemCode}-${idx}`] = true;
    });
    return init;
  });
  const [fullName, setFullName] = useState(customerName || order.customerName || "");
  const [iban, setIban] = useState("");
  const [reason, setReason] = useState("");

  const { remainingDays, periodStarted } = remainingWithdrawalDays(order);
  const expired = remainingDays < 0;
  const deliveryDateLabel = formatSkDate(order.deliveryDate);

  const selectedItems = order.items.filter((it, idx) => selected[`${it.itemCode}-${idx}`]);

  const toggleItem = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerEmail) {
      setError("Chýba e-mail objednávky. Skúste to prosím cez formulár odstúpenia.");
      return;
    }
    if (selectedItems.length === 0) {
      setError("Vyberte aspoň jednu položku, od ktorej chcete odstúpiť.");
      return;
    }
    if (fullName.trim().length < 2) {
      setError("Zadajte meno a priezvisko.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/withdrawal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: order.id,
          email: customerEmail.trim(),
          fullName: fullName.trim(),
          iban: iban.trim() || undefined,
          reason: reason.trim() || undefined,
          items: selectedItems.map((it) => ({
            item_code: it.itemCode,
            item_name: it.itemName,
            qty: it.qty,
            rate: it.rate,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Požiadavku sa nepodarilo odoslať.");
        return;
      }
      setRequestId(data.requestId);
      setDone(true);
      toast({
        title: "Odstúpenie zaregistrované",
        description: "Potvrdenie sme odoslali na e-mail objednávky.",
      });
    } catch {
      setError("Nastala chyba. Skúste to znova neskôr.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Po zatvorení vyresetuj stav potvrdenia, aby sa dal dialóg otvoriť odznova
    if (!next) {
      setDone(false);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          data-testid={`button-withdrawal-${order.id}`}
        >
          <FileMinus className="mr-2 h-4 w-4" />
          Odstúpiť od zmluvy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Odstúpenie od zmluvy</DialogTitle>
          <DialogDescription>
            Objednávka #{order.id}. Tovar zakúpený online môžete vrátiť do 14 dní bez udania dôvodu.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Odstúpenie zaregistrované</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Vašu žiadosť sme zaevidovali
              {requestId ? ` pod číslom ${requestId}` : ""}.
            </p>
            <p className="text-sm text-muted-foreground">
              Potvrdenie sme odoslali na e-mail objednávky. O ďalšom postupe vás budeme informovať.
            </p>
            <Button className="mt-4" onClick={() => handleOpenChange(false)}>
              Zavrieť
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {expired ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  14-dňová lehota na odstúpenie už pravdepodobne uplynula. Požiadavku môžete odoslať,
                  posúdime ju individuálne.
                </AlertDescription>
              </Alert>
            ) : !periodStarted ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  14-dňová lehota na odstúpenie začne plynúť až po doručení tovaru
                  {deliveryDateLabel ? ` (${deliveryDateLabel})` : ""}. Od zmluvy môžete
                  odstúpiť aj teraz, ešte pred doručením.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Na odstúpenie od zmluvy vám zostáva <strong>{remainingDays} dní</strong> (14-dňová lehota).
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label className="mb-2 block">Položky na vrátenie</Label>
              <div className="space-y-2">
                {order.items.map((it, idx) => {
                  const key = `${it.itemCode}-${idx}`;
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
                        <div className="font-medium">{it.itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          Kód: {it.itemCode} · {it.qty} ks
                        </div>
                      </div>
                      <div className="text-sm font-medium">{formatPrice(it.rate * it.qty)}</div>
                    </label>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor={`wd-fullName-${order.id}`}>Meno a priezvisko</Label>
              <Input
                id={`wd-fullName-${order.id}`}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                data-testid="input-withdrawal-fullName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`wd-iban-${order.id}`}>IBAN na vrátenie peňazí (nepovinné)</Label>
              <Input
                id={`wd-iban-${order.id}`}
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="SK00 0000 0000 0000 0000 0000"
                data-testid="input-withdrawal-iban"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`wd-reason-${order.id}`}>Dôvod (nepovinné)</Label>
              <Textarea
                id={`wd-reason-${order.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Pri odstúpení od zmluvy nemusíte uvádzať dôvod."
                data-testid="input-withdrawal-reason"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Zrušiť
              </Button>
              <Button type="submit" disabled={loading} data-testid="button-withdrawal-submit">
                {loading ? "Odosielam…" : "Odoslať odstúpenie"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
