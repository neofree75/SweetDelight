import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, FileText, Calendar, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder dáta pre demo účely - rozšírené pre testovanie stránkovania
const mockInvoices = [
  { id: "INV-2024-001", orderNumber: "SO-001", issueDate: "2024-03-15", dueDate: "2024-03-30", amount: 45.60, currency: "EUR", status: "Zaplatené", downloadUrl: "#" },
  { id: "INV-2024-002", orderNumber: "SO-002", issueDate: "2024-03-10", dueDate: "2024-03-25", amount: 32.80, currency: "EUR", status: "Čaká na platbu", downloadUrl: "#" },
  { id: "INV-2024-003", orderNumber: "SO-003", issueDate: "2024-03-08", dueDate: "2024-03-23", amount: 28.50, currency: "EUR", status: "Zaplatené", downloadUrl: "#" },
  { id: "INV-2024-004", orderNumber: "SO-004", issueDate: "2024-03-05", dueDate: "2024-03-20", amount: 67.90, currency: "EUR", status: "Po splatnosti", downloadUrl: "#" },
  { id: "INV-2024-005", orderNumber: "SO-005", issueDate: "2024-03-02", dueDate: "2024-03-17", amount: 42.30, currency: "EUR", status: "Čaká na platbu", downloadUrl: "#" },
  { id: "INV-2024-006", orderNumber: "SO-006", issueDate: "2024-02-28", dueDate: "2024-03-15", amount: 55.20, currency: "EUR", status: "Zaplatené", downloadUrl: "#" },
  { id: "INV-2024-007", orderNumber: "SO-007", issueDate: "2024-02-25", dueDate: "2024-03-12", amount: 38.70, currency: "EUR", status: "Zaplatené", downloadUrl: "#" },
  { id: "INV-2024-008", orderNumber: "SO-008", issueDate: "2024-02-20", dueDate: "2024-03-07", amount: 73.40, currency: "EUR", status: "Čaká na platbu", downloadUrl: "#" },
  { id: "INV-2024-009", orderNumber: "SO-009", issueDate: "2024-02-15", dueDate: "2024-03-02", amount: 29.90, currency: "EUR", status: "Po splatnosti", downloadUrl: "#" },
  { id: "INV-2024-010", orderNumber: "SO-010", issueDate: "2024-02-12", dueDate: "2024-02-27", amount: 61.80, currency: "EUR", status: "Zaplatené", downloadUrl: "#" },
  { id: "INV-2024-011", orderNumber: "SO-011", issueDate: "2024-02-08", dueDate: "2024-02-23", amount: 44.20, currency: "EUR", status: "Zaplatené", downloadUrl: "#" },
  { id: "INV-2024-012", orderNumber: "SO-012", issueDate: "2024-02-05", dueDate: "2024-02-20", amount: 52.60, currency: "EUR", status: "Čaká na platbu", downloadUrl: "#" },
  { id: "INV-2024-013", orderNumber: "SO-013", issueDate: "2024-02-01", dueDate: "2024-02-16", amount: 37.40, currency: "EUR", status: "Po splatnosti", downloadUrl: "#" }
];

const ITEMS_PER_PAGE = 10;

export function Invoices() {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Pagination calculations
  const totalInvoices = mockInvoices.length;
  const totalPages = Math.ceil(totalInvoices / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedInvoices = mockInvoices.slice(startIndex, endIndex);
  
  // Show pagination only if more than ITEMS_PER_PAGE invoices
  const showPagination = totalInvoices > ITEMS_PER_PAGE;
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
          Moje faktúry ({totalInvoices})
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
        
        {paginatedInvoices.map((invoice) => (
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
      
      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between mt-8" data-testid="pagination-controls">
          <div className="text-sm text-muted-foreground">
            Zobrazujem {startIndex + 1}-{Math.min(endIndex, totalInvoices)} z {totalInvoices} faktúr
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Predošlá
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  data-testid={`button-page-${page}`}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Ďalšia
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}