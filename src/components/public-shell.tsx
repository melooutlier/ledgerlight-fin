import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MelfyBrand } from "@/components/melfy-brand";

export function PublicShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="public-site min-h-screen bg-background">
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="Melfy início"><MelfyBrand /></Link>
        <nav aria-label="Menu principal" className="hidden items-center gap-8 md:flex">
          <Link to="/" activeProps={{ className: "text-primary" }} className="text-sm font-medium">Início</Link>
          <Link to="/funcionalidades" activeProps={{ className: "text-primary" }} className="text-sm font-medium">Funcionalidades</Link>
          <Link to="/precos" activeProps={{ className: "text-primary" }} className="text-sm font-medium">Planos</Link>
        </nav>
        <div className="flex items-center gap-2"><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth" search={{ mode: "signin", plan: undefined }}>Entrar</Link></Button><Button asChild className="hidden sm:inline-flex"><Link to="/precos">Começar agora <ArrowUpRight /></Link></Button><Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button></div>
      </div>
      {open && <nav aria-label="Menu móvel" className="grid gap-2 border-t px-5 py-4 md:hidden">{[{ to: "/", label: "Início" }, { to: "/funcionalidades", label: "Funcionalidades" }, { to: "/precos", label: "Planos" }] .map(i => <Button key={i.to} variant="ghost" asChild className="justify-start"><Link to={i.to} onClick={() => setOpen(false)}>{i.label}</Link></Button>)}<Button asChild><Link to="/auth" search={{ mode: "signin", plan: undefined }}>Entrar na minha conta</Link></Button></nav>}
    </header>
    <main>{children}</main>
    <footer className="border-t bg-surface"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 py-10 sm:flex-row sm:px-8"><div><Link to="/"><MelfyBrand /></Link><p className="mt-3 text-sm text-muted-foreground">Mais clareza para o seu dinheiro.</p></div><div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground"><Link to="/funcionalidades">Funcionalidades</Link><Link to="/precos">Planos</Link><Link to="/auth" search={{ mode: "signin", plan: undefined }}>Entrar</Link><span>© {new Date().getFullYear()} Melfy</span></div></div></footer>
  </div>;
}