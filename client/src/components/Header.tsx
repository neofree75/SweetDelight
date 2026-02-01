import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Menu, X, LogIn, UserPlus, LogOut, FileText } from 'lucide-react';
import logo from '@assets/logo_1757937077215.png';

interface User {
  email: string;
  name: string;
}

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export default function Header({ cartItemCount = 0, onCartClick, user, onLogout }: HeaderProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Domov' },
    { path: '/obchod', label: 'Obchod' },
    { path: '/torta-na-mieru', label: 'Torta na mieru' },
    { path: '/torta-na-mieru-2', label: 'Torta na mieru 2' },
    { path: '/fotogaleria', label: 'Fotogaléria' },
    { path: '/ako-objednat', label: 'Ako objednať' },
    { path: '/o-nas', label: 'O nás' },
    { path: '/kontakt', label: 'Kontakt' },
  ];

  return (
    <header className="bg-card border-b border-card-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <div className="flex items-center">
              <img 
                src={logo} 
                alt="Marsela Bakery Logo" 
                className="h-12 w-12 md:h-16 md:w-16 object-contain"
              />
              <div className="ml-3 hidden sm:block">
                <h1 className="text-xl md:text-2xl font-serif font-bold text-primary">
                  Marsela Bakery
                </h1>
                <span className="font-accent text-sm text-muted-foreground">
                  Čerstvé. Výborné. Sladké.
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path} data-testid={`link-${item.label.toLowerCase()}`}>
                <span className={`text-foreground hover:text-primary transition-colors ${
                  location === item.path ? 'font-medium text-primary' : ''
                }`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Auth Links and Cart */}
          <div className="flex items-center space-x-4">
            {/* Authentication Links - Desktop */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                // User is logged in - show logout and orders shortcut
                <>
                  <Link href="/moj-ucet?section=objednavky">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-orders"
                    >
                      <FileText className="h-4 w-4" />
                      Moje objednávky
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="flex items-center gap-2"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    Odhlásiť sa
                  </Button>
                </>
              ) : (
                // User is not logged in - show register and login
                <>
                  <Link href="/registracia">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-register"
                    >
                      <UserPlus className="h-4 w-4" />
                      Registrovať
                    </Button>
                  </Link>
                  
                  <Link href="/prihlasenie">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-login"
                    >
                      <LogIn className="h-4 w-4" />
                      Prihlásiť sa
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick}
              className="relative"
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-card-border">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path} data-testid={`mobile-link-${item.label.toLowerCase()}`}>
                  <span 
                    className={`text-foreground hover:text-primary transition-colors block ${
                      location === item.path ? 'font-medium text-primary' : ''
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
              
              {/* Mobile Auth Links */}
              <div className="border-t border-card-border pt-4">
                {user ? (
                  // User is logged in - show orders shortcut and logout
                  <div className="space-y-2">
                    <Link href="/moj-ucet?section=objednavky">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 w-full justify-start"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-button-orders"
                      >
                        <FileText className="h-4 w-4" />
                        Moje objednávky
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onLogout?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full justify-start"
                      data-testid="mobile-button-logout"
                    >
                      <LogOut className="h-4 w-4" />
                      Odhlásiť sa
                    </Button>
                  </div>
                ) : (
                  // User is not logged in - show register and login
                  <div className="space-y-2">
                    <Link href="/registracia">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 w-full justify-start"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-button-register"
                      >
                        <UserPlus className="h-4 w-4" />
                        Registrovať
                      </Button>
                    </Link>
                    
                    <Link href="/prihlasenie">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 w-full justify-start"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-button-login"
                      >
                        <LogIn className="h-4 w-4" />
                        Prihlásiť sa
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}