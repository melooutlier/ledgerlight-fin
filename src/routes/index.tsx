import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Check, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/public-shell";
import { PublicPlans } from "@/components/public-plans";
import { MelfyFeatures } from "@/components/melfy-features";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Melfy — O seu dinheiro, com mais clareza" },
    { name: "description", content: "Organize entradas, despesas, contas M-Pesa, e-Mola e bancos em meticais. Conheça os planos Melfy e adira." },
    { property: "og:title", content: "Melfy — O seu dinheiro, com mais clareza" },
    { property: "og:description", content: "Finanças pessoais em meticais. Conheça o Melfy e escolha o seu plano." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});

function PhoneMock() {
  return <div className="relative mx-auto w-full max-w-[320px]">
    <div className="absolute -inset-8 -z-10 rounded-full bg-primary/20 blur-3xl" />
    <div className="rounded-[2.5rem] border border-border bg-sidebar p-3 shadow-2xl">
      <div className="space-y-3 rounded-[2rem] bg-background p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Terça-feira, 20 de Outubro</p>
        <p className="text-xl font-extrabold">Olá, <span className="text-primary">Ana</span></p>
        <div className="melfy-glow-card rounded-3xl border p-4">
          <p className="text-xs text-muted-foreground">Saldo atual</p>
          <p className="tnum mt-1 text-2xl font-extrabold">24.500 MT</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-positive text-primary-foreground"><ArrowDown className="size-3.5" /></span><div><p className="text-muted-foreground">Receitas</p><p className="tnum font-bold text-positive">20.000</p></div></div>
            <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-destructive text-destructive-foreground"><ArrowUp className="size-3.5" /></span><div><p className="text-muted-foreground">Despesas</p><p className="tnum font-bold text-destructive">6.200</p></div></div>
          </div>
        </div>
        {([["🍔", "Almoço", "-350 MT"], ["📱", "Recarga M-Pesa", "-200 MT"], ["💼", "Salário", "+20.000 MT"]] as const).map(([e, n, v]) => <div key={n} className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-sm"><span className="text-lg">{e}</span><span className="flex-1 font-medium">{n}</span><span className={v.startsWith("+") ? "tnum font-bold text-positive" : "tnum font-bold"}>{v}</span></div>)}
      </div>
    </div>
  </div>;
}

function HomePage() {
  return <PublicShell>
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-14 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:py-24">
      <div>
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary"><span className="size-1.5 rounded-full bg-primary" /> Menos preocupação. Mais vida.</p>
        <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-6xl">O seu dinheiro,<br /><span className="text-primary">com mais clareza.</span></h1>
        <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Saiba para onde vai cada metical. Junte M-Pesa, e-Mola e bancos num só lugar, acompanhe os gastos e planeie o futuro.</p>
        <div className="mt-8 grid gap-3 sm:flex"><Button asChild size="lg" className="h-13 rounded-2xl px-7 text-base"><Link to="/precos">Começar agora <ArrowUpRight /></Link></Button><Button asChild variant="secondary" size="lg" className="h-13 rounded-2xl px-7 text-base"><Link to="/funcionalidades">Conhecer o Melfy</Link></Button></div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="size-4 text-primary" /> A partir de 150 MT/mês</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" /> Dados privados</span><span className="flex items-center gap-1.5"><Smartphone className="size-4 text-primary" /> Android, iOS e PC</span></div>
      </div>
      <PhoneMock />
    </section>
    <div className="border-y bg-sidebar"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-6 text-sm sm:px-8"><p className="font-medium text-muted-foreground">Feito para a sua vida em Moçambique</p><div className="flex flex-wrap gap-7 font-bold"><span>M-Pesa</span><span>e-Mola</span><span>mKesh</span><span>Bancos</span><span className="text-primary">Metical · MT</span></div></div></div>
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8"><div className="mb-12 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Tudo mais simples</p><h2 className="mt-4 text-3xl font-bold sm:text-4xl">Uma vida financeira<br />mais organizada.</h2></div><Button asChild variant="link"><Link to="/funcionalidades">Ver funcionalidades <ArrowRight /></Link></Button></div><MelfyFeatures /></section>
    <section className="border-y bg-sidebar px-5 py-20 sm:px-8"><div className="mx-auto max-w-6xl"><div className="mb-10 text-center"><p className="text-xs font-bold uppercase tracking-widest text-primary">Invista na sua tranquilidade</p><h2 className="mt-4 text-3xl font-bold sm:text-4xl">Um plano à sua medida.</h2><p className="mt-4 text-muted-foreground">Comece pelo essencial ou tenha uma experiência completa.</p></div><PublicPlans /></div></section>
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8"><div className="melfy-glow-card flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-bold">O próximo passo começa consigo.</h2><p className="mt-3 text-muted-foreground">Dê ao seu dinheiro um lugar para se organizar.</p></div><Button asChild size="lg" className="w-full rounded-2xl sm:w-auto"><Link to="/precos">Começar com o Melfy <ArrowRight /></Link></Button></div></section>
  </PublicShell>;
}
