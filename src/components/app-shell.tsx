import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  HandCoins,
  House,
  Landmark,
  ListOrdered,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  Tags,
  Crown,
  Eye,
  EyeOff,
  Shield,
  Coins,
  Target,
  Moon,
  Sun,
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
import { useIsAdmin, usePlan, useCurrentUser } from "@/lib/data";
import { applyTheme, readSavedTheme, setThemeChoice, type ThemeChoice } from "@/lib/theme";
import { MelfyBrand } from "@/components/melfy-brand";

const NAV_GROUPS = [
  {
    label: "Painel",
    items: [
      { to: "/inicio", label: "Início", icon: House },
      { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
      { to: "/orcamento", label: "Orçamento", icon: Target },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/poupanca", label: "Poupança", icon: Coins },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/categorias", label: "Categorias", icon: Tags },
      { to: "/contas", label: "Contas", icon: Landmark },
      { to: "/emprestimos", label: "Empréstimos", icon: HandCoins },
      { to: "/adiantamentos", label: "Adiantamentos", icon: PiggyBank },
      { to: "/casa", label: "Despesas fixas", icon: House },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/planos", label: "Planos", icon: Crown },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
] as const;

const COLLAPSE_KEY = "melfy-sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MovementsProvider>
      <Shell>{children}</Shell>
    </MovementsProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasAccess, isAdmin, isLoading } = usePlan();
  const accessExempt = pathname.startsWith("/configuracoes") || pathname.startsWith("/planos") || pathname.startsWith("/admin");
  const contentAllowed = hasAccess || isAdmin || accessExempt;

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* default expanded */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {
        /* session only */
      }
      return !value;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} onNavigate={() => undefined} />
        <Footer collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-1/2 z-40 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground lg:grid"
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>
      </aside>

      <div className={cn("min-w-0", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
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
                  <Brand collapsed={false} />
                  <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
                  <Footer collapsed={false} />
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

        <main className="app-main mx-auto w-full min-w-0 max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
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

function Brand({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-7">
        <Link to="/inicio" aria-label="Melfy">
          <MelfyBrand className="text-2xl [&_svg]:size-8 [&>span:last-child]:hidden" />
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-5 py-7">
      <div className="leading-tight">
        <Link to="/inicio"><MelfyBrand /></Link>
        <p className="mt-2 text-xs text-muted-foreground">O seu dinheiro, com clareza.</p>
      </div>
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const { hasAccess, isAdmin: planAdmin } = usePlan();
  const visible = hasAccess || isAdmin || planAdmin
    ? NAV_GROUPS
    : NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => item.to === "/planos" || item.to === "/configuracoes") }));

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-4">
      {visible.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">{group.label}</p>
          )}
          {collapsed && <div className="mx-3 border-t border-sidebar-border pt-3 first:border-0" />}
          <nav className="space-y-1">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                    active
                      ? "bg-accent font-bold text-accent-foreground"
                      : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
      {isAdmin && (
        <nav className="space-y-1">
          {!collapsed && <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">Gestão</p>}
          {collapsed && <div className="mx-3 border-t border-sidebar-border pt-3" />}
          <Link
            to="/admin"
            onClick={onNavigate}
            title={collapsed ? "Administração" : undefined}
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
              pathname.startsWith("/admin")
                ? "bg-accent font-bold text-accent-foreground"
                : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Shield className="size-[18px] shrink-0" />
            {!collapsed && "Administração"}
          </Link>
        </nav>
      )}
    </div>
  );
}

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasAccess, isAdmin, isLoading } = usePlan();
  if (isLoading || (!hasAccess && !isAdmin)) return null;
  const items = [
    { to: "/inicio", label: "Início", icon: House },
    { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
    { to: "/orcamento", label: "Orçamento", icon: Target },
    { to: "/contas", label: "Contas", icon: Landmark },
  ] as const;
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

function Footer({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const hidden = usePrivacy();

  const metadata = user?.user_metadata ?? {};
  const name = ((metadata["display_name"] as string | undefined) ?? (metadata["full_name"] as string | undefined) ?? user?.email?.split("@")[0] ?? "") as string;
  const email = user?.email ?? "";
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin", plan: undefined } });
  }

  return (
    <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex flex-col items-center gap-2")}>
      {!collapsed ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-background/60 p-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">{initial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{name || "Utilizador"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <PrivacyToggle wide={false} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Terminar sessão"
              title="Terminar sessão"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground" title={name || email}>{initial}</span>
          <PrivacyToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Terminar sessão"
            title="Terminar sessão"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="size-4" />
          </Button>
        </>
      )}
      {!collapsed && hidden && <p className="pt-1 text-center text-[10px] text-muted-foreground">Saldos ocultos</p>}
    </div>
  );
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemeChoice>("light");

  useEffect(() => {
    setThemeState(readSavedTheme());
  }, []);

  function toggle() {
    const next: ThemeChoice = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    setThemeChoice(next);
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      onClick={toggle}
      className="rounded-full"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
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
  const { hasAccess, isAdmin, isLoading } = usePlan();
  if (isLoading || (!hasAccess && !isAdmin)) return null;
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
