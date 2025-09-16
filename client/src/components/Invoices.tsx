import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, FileText, Calendar, Download, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Invoice } from "@shared/schema";

interface InvoicesResponse {
  invoices: Invoice[];
}

const ITEMS_PER_PAGE = 10;

export function Invoices() {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Načítaj faktúry z API
  const { data: invoicesResponse, isLoading, error } = useQuery<InvoicesResponse>({
    queryKey: ['/api/user-invoices'],
    staleTime: 0, // Vždy považuj dáta za zastarané
    refetchOnMount: true, // Vždy refetch pri mount
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-invoices">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Načítavam faktúry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" data-testid="error-invoices">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Chyba pri načítaní faktúr
        </h3>
        <p className="text-muted-foreground">
          Nie je možné načítať vaše faktúry. Skúste to prosím neskôr.
        </p>
      </div>
    );
  }

  const invoices: Invoice[] = invoicesResponse?.invoices || [];

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-invoices">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Zatiaľ nemáte žiadne faktúry
        </h3>
        <p className="text-muted-foreground">
          Keď si objednáte niečo z našej ponuky, vaše faktúry sa zobrazia tu.
        </p>
      </div>
    );
  }
  
  // Pagination calculations
  const totalInvoices = invoices.length;
  const totalPages = Math.ceil(totalInvoices / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedInvoices = invoices.slice(startIndex, endIndex);
  
  // Show pagination only if more than ITEMS_PER_PAGE invoices
  const showPagination = totalInvoices > ITEMS_PER_PAGE;
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'zaplatené':
        return 'default';
      case 'submitted':
      case 'draft':
      case 'čaká na platbu':
        return 'secondary';
      case 'overdue':
      case 'po splatnosti':
        return 'destructive';
      case 'cancelled':
      case 'zrušené':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: sk });
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

      {/* Skutočné faktúry */}
      <div className="space-y-4">
        {paginatedInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover-elevate" data-testid={`invoice-${invoice.id}`}>
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
                {invoice.orderNumber && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Objednávka: {invoice.orderNumber}</span>
                  </div>
                )}
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
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">Celková suma:</span>
                    <div className="text-lg font-bold text-foreground">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                  </div>
                  {invoice.outstandingAmount > 0 && (
                    <div>
                      <span className="text-muted-foreground">Zostáva uhradiť:</span>
                      <div className="text-sm font-medium text-destructive">
                        {formatCurrency(invoice.outstandingAmount, invoice.currency)}
                      </div>
                    </div>
                  )}
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