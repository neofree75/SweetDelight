import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatWidget } from "@/components/ChatWidget";
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
import Billing from "@/pages/Billing";
import Registration from "@/pages/Registration";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import Account from "@/pages/Account";
import NotFound from "@/pages/not-found";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface User {
  email: string;
  name: string;
}

function Router({ cartItems, onAddToCart, onCartOpen, onLogin, user }: { 
  cartItems: CartItem[]; 
  onAddToCart: (product: any, quantity: number) => void;
  onCartOpen: () => void;
  onLogin: (userData: User) => void;
  user: User | null;
}) {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
        <Checkout cartItems={cartItems} />
      </Route>
      <Route path="/pokladna">
        <Billing cartItems={cartItems} user={user} />
      </Route>
      <Route path="/registracia" component={Registration} />
      <Route path="/prihlasenie">
        <Login onLogin={onLogin} />
      </Route>
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/moj-profil">
        <Account user={user} />
      </Route>
      <Route path="/o-nas" component={About} />
      <Route path="/kontakt" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Header 
            cartItemCount={cartItemCount} 
            onCartClick={handleCartClick}
            user={user}
            onLogout={handleLogout}
          />
          
          <main>
            <Router 
              cartItems={cartItems}
              user={user}
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
                    if (product.customAttributes && Object.keys(product.customAttributes).length > 0) {
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
                      price: product.price,
                      quantity,
                      image: product.image,
                      additional_notes: additionalNotes || undefined
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
        
        <ChatWidget />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
