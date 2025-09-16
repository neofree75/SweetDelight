import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Calendar, CreditCard, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { UserOrder } from "@shared/schema";

interface OrdersResponse {
  orders: UserOrder[];
  customer: {
    id: string;
    name: string;
    email: string;
  };
}

const ITEMS_PER_PAGE = 10;

export function Orders() {
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ['/api/user-orders'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-orders">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Načítavam objednávky...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" data-testid="error-orders">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Chyba pri načítaní objednávok
        </h3>
        <p className="text-muted-foreground">
          Nie je možné načítať vaše objednávky. Skúste to prosím neskôr.
        </p>
      </div>
    );
  }

  if (!data?.orders || data.orders.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-orders">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Zatiaľ nemáte žiadne objednávky
        </h3>
        <p className="text-muted-foreground">
          Keď si objednáte niečo z našej ponuky, vaše objednávky sa zobrazia tu.
        </p>
      </div>
    );
  }

  // Pagination calculations
  const totalOrders = data.orders.length;
  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = data.orders.slice(startIndex, endIndex);
  
  // Show pagination only if more than ITEMS_PER_PAGE orders
  const showPagination = totalOrders > ITEMS_PER_PAGE;

  const getStatusColor = (status: string) => {
    const s = (status ?? "").toLowerCase();
    // Všeobecné farebné kódovanie na základe bežných slovných indikátorov
    if (s.includes('zruš') || s.includes('cancel') || s.includes('stopped') || s.includes('zastav')) {
      return 'destructive';
    }
    if (s.includes('draft') || s.includes('návrh') || s.includes('nový') || s.includes('new')) {
      return 'secondary';
    }
    // Všetko ostatné je aktívny stav
    return 'default';
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
    <div className="space-y-6" data-testid="orders-list">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          Moje objednávky ({data.orders.length})
        </h2>
      </div>

      <div className="space-y-4">
        {paginatedOrders.map((order) => (
          <Card key={order.id} className="hover-elevate" data-testid={`order-${order.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Objednávka #{order.id}
                </CardTitle>
                <Badge 
                  variant={getStatusColor(order.status)}
                  data-testid={`order-status-${order.id}`}
                >
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(order.transactionDate)}</span>
                </div>
                {order.deliveryDate && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Doručenie: {formatDate(order.deliveryDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-semibold text-foreground">
                    {formatCurrency(order.grandTotal, order.currency)}
                  </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              
              <div className="space-y-3">
                <h4 className="font-medium text-foreground mb-2">Položky objednávky:</h4>
                
                {order.items.map((item, index) => (
                  <div 
                    key={`${order.id}-${index}`} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`order-item-${order.id}-${index}`}
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{item.itemName}</h5>
                      <p className="text-sm text-muted-foreground">
                        Kód: {item.itemCode}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground italic">
                          {item.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {item.qty} × {formatCurrency(item.rate, order.currency)}
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatCurrency(item.amount, order.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Celková suma:</span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(order.grandTotal, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between mt-8" data-testid="pagination-controls">
          <div className="text-sm text-muted-foreground">
            Zobrazujem {startIndex + 1}-{Math.min(endIndex, totalOrders)} z {totalOrders} objednávok
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