import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  HandCoins,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  Tags,
  Landmark,
  Home,
  Crown,
  Shield,
  Coins,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { MovementsProvider, useMovements } from "@/components/movements";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/data";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/despesas", label: "Despesas", icon: ArrowDownLeft },
  { to: "/entradas", label: "Entradas", icon: ArrowUpRight },
  { to: "/emprestimos", label: "Empréstimos", icon: HandCoins },
  { to: "/adiantamentos", label: "Adiantamentos", icon: PiggyBank },
  { to: "/contas", label: "Contas", icon: Landmark },
  { to: "/poupanca", label: "Poupança", icon: Coins },
  { to: "/casa", label: "Casa", icon: Home },
  { to: "/orcamento", label: "Orçamento", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/movimentacoes", label: "Movimentações", icon: ListOrdered },
  { to: "/planos", label: "Planos", icon: Crown },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MovementsProvider>
      <Shell>{children}</Shell>
    </MovementsProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar lg:flex">
        <Brand />
        <NavList onNavigate={() => undefined} />
        <Footer />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-full flex-col bg-sidebar">
                <Brand />
                <NavList onNavigate={() => setMobileOpen(false)} />
                <Footer />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-bold">Meu Financeiro</span>
          <div className="ml-auto">
            <QuickAdd compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="size-4.5" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-bold">Meu Financeiro</p>
        <p className="text-xs text-muted-foreground">Metical (MT)</p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();

  return (
    <div className="flex-1 overflow-y-auto px-3">
      <div className="px-2 pb-3">
        <QuickAdd />
      </div>
      <nav className="space-y-0.5 pb-4">
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Shield className="size-4" /> Administração
          </Link>
        )}
      </nav>
    </div>
  );
}

function Footer() {
  const navigate = useNavigate();
  return (
    <div className="border-t p-3">
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
      >
        <LogOut className="size-4" />
        Terminar sessão
      </Button>
    </div>
  );
}

export function QuickAdd({ compact = false }: { compact?: boolean }) {
  const { openTransaction, openLoan, openAdvance } = useMovements();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={compact ? "gap-1.5" : "w-full gap-2"} size={compact ? "sm" : "default"}>
          <Plus className="size-4" />
          {compact ? "Novo" : "Nova movimentação"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-52">
        <DropdownMenuItem onSelect={() => openTransaction("expense")}>
          <ArrowDownLeft className="size-4" /> Nova despesa
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openTransaction("income")}>
          <ArrowUpRight className="size-4" /> Nova entrada
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openLoan()}>
          <HandCoins className="size-4" /> Novo empréstimo
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openAdvance()}>
          <PiggyBank className="size-4" /> Novo adiantamento
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
