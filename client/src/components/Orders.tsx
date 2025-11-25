import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Package, Calendar, CreditCard, FileText, ChevronLeft, ChevronRight, User, Search, X, Edit, Eye } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { UserOrder } from "@shared/schema";

interface OrdersResponse {
  orders: UserOrder[];
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  isAdminView?: boolean;
}

const ITEMS_PER_PAGE = 10;

const calculateOrderTotals = (order: UserOrder) => {
  const withoutVat = order.totalWithoutVat ?? order.total ?? 0;
  const vat = order.totalVat ?? Math.max(order.grandTotal - withoutVat, 0);
  const withVat = order.grandTotal ?? withoutVat + vat;
  return { withoutVat, vat, withVat };
};

const getVatRateLabel = (order: UserOrder) => {
  const itemWithVat = order.items.find(item => typeof item.vatRate === 'number' && item.vatRate > 0);
  return itemWithVat?.vatRate;
};

export function Orders() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { data, isLoading, error, refetch } = useQuery<OrdersResponse>({
    queryKey: ['/api/user-orders'],
    staleTime: 0, // Vždy považuj dáta za zastarané
    refetchOnMount: true, // Vždy refreshuj keď sa komponent načíta
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

  // Filter orders based on search query
  const filteredOrders = data.orders.filter(order => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query) ||
      (order.customerName && order.customerName.toLowerCase().includes(query)) ||
      (order.customer && order.customer.toLowerCase().includes(query))
    );
  });

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the orders data
        await refetch();
      } else {
        alert(`Chyba: ${result.error || 'Nepodarilo sa zmeniť stav objednávky'}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Chyba pri zmene stavu objednávky');
    } finally {
      setIsUpdating(false);
      setEditingOrder(null);
      setNewStatus("");
    }
  };

  // Open edit dialog
  const openEditDialog = (orderId: string, currentStatus: string) => {
    setEditingOrder(orderId);
    setNewStatus(currentStatus);
  };

  // Show no results message when search returns empty
  if (searchQuery && filteredOrders.length === 0) {
    return (
      <div className="space-y-6" data-testid="orders-list">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {data.isAdminView ? `Všetky objednávky (${data.orders.length})` : `Moje objednávky (${data.orders.length})`}
          </h2>
          {data.isAdminView && (
            <Badge variant="secondary" className="ml-2">
              Admin pohľad
            </Badge>
          )}
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hľadať podľa ID, zákazníka, statusu..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="text-center py-12" data-testid="no-search-results">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenašli sa žiadne objednávky
          </h3>
          <p className="text-muted-foreground mb-4">
            Pre vyhľadávanie "{searchQuery}" sa nenašli žiadne výsledky.
          </p>
          <Button onClick={clearSearch} variant="outline">
            Vymazať vyhľadávanie
          </Button>
        </div>
      </div>
    );
  }

  // Pagination calculations
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  
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

  // Check if order status is "New" and can be paid
  const isOrderNew = (status: string) => {
    const s = (status ?? "").toLowerCase();
    return s.includes('nov') || s.includes('new') || s.includes('návrh') || s.includes('draft');
  };

  // Handle pay button click
  const handlePayOrder = (order: UserOrder) => {
    // Store order data for payment processing
    const orderPaymentData = {
      orderId: order.id,
      customerName: data?.customer?.name,
      customerEmail: data?.customer?.email,
      grandTotal: order.grandTotal,
      currency: order.currency,
      deliveryDate: order.deliveryDate,
      items: order.items
    };
    
    localStorage.setItem('orderPaymentData', JSON.stringify(orderPaymentData));
    setLocation(`/payment-existing-order?orderId=${order.id}`);
  };

  return (
    <div className="space-y-6" data-testid="orders-list">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {data.isAdminView ? `Všetky objednávky (${data.orders.length})` : `Moje objednávky (${data.orders.length})`}
        </h2>
        {data.isAdminView && (
          <Badge variant="secondary" className="ml-2">
            Admin pohľad
          </Badge>
        )}
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať podľa ID, zákazníka, statusu..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            {totalOrders} z {data.orders.length} objednávok
          </div>
        )}
      </div>

      <div className="space-y-4">
        {paginatedOrders.map((order) => {
          const orderTotals = calculateOrderTotals(order);
          const vatLabel = getVatRateLabel(order);

          return (
          <Card key={order.id} className="hover-elevate" data-testid={`order-${order.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Objednávka #{order.id}
                    <br />

                  </CardTitle>
              <div className="mt-1 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                      <User className="h-3 w-3" />
                      <span>{order.customerName || order.customer}</span>
                    </div>

                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getStatusColor(order.status)}
                    data-testid={`order-status-${order.id}`}
                  >
                    {order.status}
                  </Badge>
                  {data.isAdminView && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(order.id, order.status)}
                          className="h-6 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Zmeniť stav objednávky</DialogTitle>
                          <DialogDescription>
                            Zmeňte stav objednávky #{order.id}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Aktuálny stav:</label>
                            <Badge variant={getStatusColor(order.status)} className="ml-2">
                              {order.status}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Nový stav:</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Vyberte nový stav" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Nová">Nová</SelectItem>
                                <SelectItem value="Potvrdená">Potvrdená</SelectItem>
                                <SelectItem value="V príprave">V príprave</SelectItem>
                                <SelectItem value="Dokončená">Dokončená</SelectItem>
                                <SelectItem value="Zrušená">Zrušená</SelectItem>
                                <SelectItem value="Dodaná">Dodaná</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingOrder(null);
                              setNewStatus("");
                            }}
                          >
                            Zrušiť
                          </Button>
                          <Button
                            onClick={() => updateOrderStatus(order.id, newStatus)}
                            disabled={isUpdating || !newStatus || newStatus === order.status}
                          >
                            {isUpdating ? "Ukladám..." : "Uložiť zmenu"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(order.transactionDate)}</span>
                </div>
                {order.deliveryDate && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Doručenie: {formatDate(order.deliveryDate)}{order.deliveryTime ? ` ${order.deliveryTime}` : ''}</span>
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
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cena bez DPH</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(orderTotals.withoutVat, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    DPH{typeof vatLabel === 'number' ? ` (${vatLabel}%)` : ''}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(orderTotals.vat, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cena s DPH</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(orderTotals.withVat, order.currency)}
                  </span>
                </div>
              </div>

              {/* Pay button for orders with "New" status */}
              {isOrderNew(order.status) && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handlePayOrder(order)}
                      className="w-full sm:w-auto"
                      data-testid={`button-pay-order-${order.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Detail objednávky
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
        })}
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