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
  Eye,
  EyeOff,
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
import { setPrivacy, usePrivacy } from "@/lib/privacy";
import { useIsAdmin, usePlan } from "@/lib/data";
import { MelfyBrand } from "@/components/melfy-brand";

const NAV = [
  { to: "/inicio", label: "Visão geral", icon: LayoutDashboard },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasAccess, isAdmin, isLoading } = usePlan();
  const accessExempt = pathname.startsWith("/configuracoes") || pathname.startsWith("/planos") || pathname.startsWith("/admin");
  const contentAllowed = hasAccess || isAdmin || accessExempt;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <NavList onNavigate={() => undefined} />
        <Footer />
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="mobile-header sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-full flex-col bg-sidebar">
                <Brand />
                <NavList onNavigate={() => setMobileOpen(false)} />
                <Footer />
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/inicio"><MelfyBrand className="text-lg [&_svg]:size-6" /></Link>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <PrivacyToggle />
            <QuickAdd compact />
          </div>
        </header>

        <main className="app-main mx-auto w-full min-w-0 max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {isLoading ? (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">A verificar os acessos da sua conta…</div>
          ) : contentAllowed ? children : <AccessBlocked />}
        </main>
      </div>
      <MobileNav />
      <QuickAdd floating />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 py-8">
      <div className="leading-tight">
        <Link to="/inicio"><MelfyBrand /></Link>
        <p className="mt-2 text-xs text-muted-foreground">O seu dinheiro, com clareza.</p>
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
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
               <item.icon className="size-4 shrink-0" />
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

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [NAV[0], NAV[1], NAV[2], NAV[5]];
  return (
    <nav aria-label="Navegação principal" className="mobile-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-surface/95 px-2 pt-2 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Button key={item.to} asChild variant="ghost" className={cn("h-14 min-w-0 flex-col gap-1 rounded-lg px-1 text-[11px]", active ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
            <Link to={item.to} aria-current={active ? "page" : undefined}>
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

function Footer() {
  const navigate = useNavigate();
  return (
    <div className="border-t p-3">
      <div className="pb-1">
        <PrivacyToggle wide />
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground"
        onClick={async () => {
          await supabase.auth.signOut();
           navigate({ to: "/auth", search: { mode: "signin", plan: undefined } });
        }}
      >
        <LogOut className="size-4" />
        Terminar sessão
      </Button>
    </div>
  );
}

function PrivacyToggle({ wide = false }: { wide?: boolean }) {
  const hidden = usePrivacy();
  return (
    <Button
      variant="ghost"
      size={wide ? "default" : "icon"}
      aria-label={hidden ? "Mostrar saldos" : "Ocultar saldos"}
      title={hidden ? "Mostrar saldos" : "Ocultar saldos"}
      className={cn(wide ? "w-full justify-start gap-3 text-muted-foreground" : "text-muted-foreground")}
      onClick={() => setPrivacy(!hidden)}
    >
      {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      {wide && (hidden ? "Mostrar saldos" : "Ocultar saldos")}
    </Button>
  );
}

export function QuickAdd({ compact = false, floating = false }: { compact?: boolean; floating?: boolean }) {
  const { openTransaction, openLoan, openAdvance } = useMovements();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Nova movimentação" className={floating ? "melfy-fab size-14 rounded-full shadow-xl" : compact ? "gap-1.5" : "w-full gap-2"} size={floating ? "icon" : compact ? "sm" : "default"}>
          <Plus className={floating ? "size-6" : "size-4"} />
          {floating ? <span className="sr-only">Nova movimentação</span> : compact ? "Novo" : "Nova movimentação"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact || floating ? "end" : "start"} side={floating ? "top" : "bottom"} className="w-52">
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


function AccessBlocked() {
  const navigate = useNavigate();
  const { subscription } = usePlan();
  const suspended = subscription?.status === "suspended";
  const expired = !!subscription?.expires_at && subscription.expires_at.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const title = suspended ? "Acesso suspenso" : expired ? "O prazo de acesso terminou" : "A sua conta aguarda autorização";
  const description = suspended
    ? "O administrador suspendeu temporariamente o acesso às funcionalidades do Melfy."
    : expired
      ? "O período autorizado terminou. Contacte o administrador para renovar o acesso."
      : "A sua conta foi criada, mas as funcionalidades só ficam disponíveis depois de o administrador conceder acesso.";
  return (
    <section className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card p-6 text-center sm:p-9">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted"><Shield className="size-7" /></div>
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate({ to: "/configuracoes" })} variant="outline">Ver estado da conta</Button>
        <Button onClick={() => navigate({ to: "/planos" })}>Ver planos</Button>
      </div>
    </section>
  );
}
