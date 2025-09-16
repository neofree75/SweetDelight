import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { User, FileText, Receipt } from 'lucide-react';
import Profile from './Profile';
import { Orders } from '@/components/Orders';
import { Invoices } from '@/components/Invoices';

// Komponenty pre jednotlivé sekcie
function OrdersSection() {
  return (
    <div className="p-6">
      <Orders />
    </div>
  );
}

function InvoicesSection() {
  return (
    <div className="p-6">
      <Invoices />
    </div>
  );
}

interface AccountProps {
  user?: { email: string; name: string } | null;
}

export default function Account({ user }: AccountProps) {
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState('profil');

  // Presmeruj ak nie je prihlásený
  useEffect(() => {
    if (!user) {
      setLocation('/prihlasenie');
    }
  }, [user, setLocation]);

  // Ak nie je prihlásený, zobraz prázdny obsah počas presmerovania
  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (currentSection) {
      case 'profil':
        return <Profile user={user} />;
      case 'objednavky':
        return <OrdersSection />;
      case 'faktury':
        return <InvoicesSection />;
      default:
        return <Profile user={user} />;
    }
  };

  const menuItems = [
    {
      id: 'profil',
      label: 'Môj profil',
      icon: User,
    },
    {
      id: 'objednavky', 
      label: 'Objednávky',
      icon: FileText,
    },
    {
      id: 'faktury',
      label: 'Faktúry', 
      icon: Receipt,
    },
  ];

  // Custom sidebar width for account page
  const style = {
    "--sidebar-width": "16rem",       // 256px for account navigation
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-[calc(100vh-200px)] w-full">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Môj účet</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setCurrentSection(item.id)}
                        isActive={currentSection === item.id}
                        data-testid={`button-account-${item.id}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-lg font-playfair">Môj účet</h1>
            <div></div> {/* Spacer for center alignment */}
          </header>
          
          <main className="flex-1 overflow-auto bg-background">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}