import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, FileText, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder dáta pre demo účely
const mockInvoices = [
  {
    id: "INV-2024-001",
    orderNumber: "SO-001",
    issueDate: "2024-03-15",
    dueDate: "2024-03-30",
    amount: 45.60,
    currency: "EUR",
    status: "Zaplatené",
    downloadUrl: "#"
  },
  {
    id: "INV-2024-002", 
    orderNumber: "SO-002",
    issueDate: "2024-03-10",
    dueDate: "2024-03-25",
    amount: 32.80,
    currency: "EUR",
    status: "Čaká na platbu",
    downloadUrl: "#"
  }
];

export function Invoices() {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'zaplatené':
      case 'paid':
        return 'default';
      case 'čaká na platbu':
      case 'pending':
        return 'secondary';
      case 'po splatnosti':
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('sk-SK');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6" data-testid="invoices-list">
      <div className="flex items-center gap-2 mb-6">
        <Receipt className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          Moje faktúry ({mockInvoices.length})
        </h2>
      </div>

      {/* Upozornenie že je to placeholder */}
      <Card className="border-dashed border-2" data-testid="placeholder-notice">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Funkcia v príprave
            </h3>
            <p className="text-muted-foreground mb-4">
              Zobrazenie faktúr je momentálne v príprave. Nižšie vidíte ukážku toho, 
              ako bude funkcia vyzerať po dokončení.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Demo faktúry */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Ukážka faktúr:</h3>
        
        {mockInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover-elevate opacity-75" data-testid={`invoice-${invoice.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Faktúra {invoice.id}
                </CardTitle>
                <Badge 
                  variant={getStatusColor(invoice.status)}
                  data-testid={`invoice-status-${invoice.id}`}
                >
                  {invoice.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Objednávka: {invoice.orderNumber}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Vystavené: {formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Splatnosť: {formatDate(invoice.dueDate)}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">Suma na úhradu:</span>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                  data-testid={`button-download-${invoice.id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Stiahnuť PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informácia o budúcej funkcionalite */}
      <Card className="bg-muted/30" data-testid="future-features">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-foreground mb-2">Pripravované funkcie:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Automatické načítanie faktúr z ERPNext systému</li>
            <li>• Sťahovanie faktúr vo formáte PDF</li>
            <li>• Filtrovanie faktúr podľa stavu a dátumu</li>
            <li>• Oznámenia o nových faktúrach a splatnosti</li>
            <li>• Prehľad platieb a história transakcií</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}