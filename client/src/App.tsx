import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartItem } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Cart from "@/components/Cart";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import CustomCakeOrder from "@/pages/CustomCakeOrder";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import Payment from "@/pages/Payment";
import ExistingOrderPayment from "@/pages/ExistingOrderPayment";
import OrderDetail from "@/pages/OrderDetail";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Billing from "@/pages/Billing";
import Registration from "@/pages/Registration";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import Account from "@/pages/Account";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import ForgotPassword from "@/pages/ForgotPassword";
import Gallery from "@/pages/Gallery";
import NotFound from "@/pages/not-found";

interface User {
  email: string;
  name: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
}

function Router({ cartItems, onAddToCart, onCartOpen, onLogin, onClearCart, user }: { 
  cartItems: CartItem[]; 
  onAddToCart: (product: any, quantity: number) => void;
  onCartOpen: () => void;
  onLogin: (userData: User) => void;
  onClearCart: () => void;
  user: User | null;
}) {
  return (
    <Switch>
      <Route path="/">
        <Home 
          cartItems={cartItems}
          onAddToCart={onAddToCart}
          onCartOpen={onCartOpen}
        />
      </Route>
      <Route path="/obchod">
        <Shop 
          cartItems={cartItems}
          onAddToCart={onAddToCart}
          onCartOpen={onCartOpen}
        />
      </Route>
      <Route path="/produkt/:id">
        <ProductDetail
          onAddToCart={onAddToCart}
          onCartOpen={onCartOpen}
        />
      </Route>
      <Route path="/torta-na-mieru">
        <CustomCakeOrder
          onAddToCart={onAddToCart}
          onCartOpen={onCartOpen}
        />
      </Route>
      <Route path="/checkout">
        <Checkout cartItems={cartItems} onClearCart={onClearCart} />
      </Route>
      <Route path="/platba">
        <Payment onClearCart={onClearCart} />
      </Route>
      <Route path="/payment-existing-order">
        <ExistingOrderPayment user={user} />
      </Route>
      <Route path="/order-detail">
        <OrderDetail user={user} />
      </Route>
      <Route path="/payment-success">
        <PaymentSuccess onClearCart={onClearCart} />
      </Route>
      <Route path="/pokladna">
        <Billing cartItems={cartItems} user={user} onClearCart={onClearCart} />
      </Route>
      <Route path="/registracia" component={Registration} />
      <Route path="/prihlasenie">
        <Login onLogin={onLogin} />
      </Route>
      <Route path="/zabudnute-heslo" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/moj-ucet">
        <Account user={user} />
      </Route>
      <Route path="/o-nas" component={About} />
      <Route path="/kontakt" component={Contact} />
      <Route path="/fotogaleria">
        <Gallery user={user} />
      </Route>
      <Route path="/obchodne-podmienky" component={TermsOfService} />
      <Route path="/ochrana-osobnych-udajov" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize cart items from localStorage on page load
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('cartItems');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  // Check for existing session on app startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/profile', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Extract user info from profile data
            const userData = {
              email: data.data.email || '',
              name: data.data.customerName || data.data.name || '',
              id: data.data.customerId || '',
              isAdmin: data.data.isAdmin || false // Get admin status from ERPNext
            };
            setUser(userData);
            console.log('Session restored for user:', userData);
          }
        }
      } catch (error) {
        console.log('No existing session found:', error);
      }
    };

    checkSession();
  }, []);

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Save cart items to localStorage whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  const handleCartClick = () => {
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    console.log('Proceeding to checkout with items:', cartItems);
    setIsCartOpen(false);
    setLocation('/checkout');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    console.log('User logged in:', userData);
  };

  const handleLogout = async () => {
    try {
      // Call logout API to clear server session
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    }
    
    setUser(null);
    setLocation('/');
    console.log('User logged out');
  };

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header 
            cartItemCount={cartItemCount} 
            onCartClick={handleCartClick}
            user={user}
            onLogout={handleLogout}
          />
          
          <main className="flex-1 min-h-0">
            <Router 
              cartItems={cartItems}
              user={user}
              onClearCart={handleClearCart}
              onAddToCart={(product, quantity) => {
                setCartItems(prevItems => {
                  const existingItem = prevItems.find(item => item.id === product.id);
                  
                  if (existingItem) {
                    return prevItems.map(item =>
                      item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                    );
                  } else {
                    // Build additional_notes from custom attributes and special instructions
                    let additionalNotes = '';
                    // Ak má produkt customAttributesWithPrices, použij ich pre zobrazenie s cenami
                    if ((product as any).customAttributesWithPrices && Array.isArray((product as any).customAttributesWithPrices)) {
                      const attributesWithPrices = (product as any).customAttributesWithPrices as Array<{ name: string; value: string; price: number }>;
                      const attributeDescriptions = attributesWithPrices
                        .map(attr => `${attr.value}${attr.price > 0 ? ` ${attr.price} €` : ''}`)
                        .join(', ');
                      additionalNotes = attributeDescriptions;
                    } else if (product.customAttributes && Object.keys(product.customAttributes).length > 0) {
                      const attributeDescriptions = Object.entries(product.customAttributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                      additionalNotes = attributeDescriptions;
                    }
                    if (product.specialInstructions) {
                      additionalNotes += additionalNotes ? `, Poznámky: ${product.specialInstructions}` : `Poznámky: ${product.specialInstructions}`;
                    }

                    return [...prevItems, {
                      id: product.id,
                      name: product.name,
                      price: product.price, // Cena bez DPH
                      quantity,
                      image: product.image,
                      additional_notes: additionalNotes || undefined,
                      minOrderQuantity: product.minOrderQuantity || 1,
                      // VAT information
                      vatRate: product.vatRate,
                      priceWithVat: product.priceWithVat,
                      // Ulož customAttributesWithPrices pre zobrazenie v košíku a súhrne
                      customAttributesWithPrices: (product as any).customAttributesWithPrices
                    }];
                  }
                });
              }}
              onCartOpen={handleCartClick}
              onLogin={handleLogin}
            />
          </main>
          
          <Footer />
          
          <Cart
            items={cartItems}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onCheckout={handleCheckout}
          />
        </div>
        
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
