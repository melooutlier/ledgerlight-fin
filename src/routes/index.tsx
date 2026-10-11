import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/public-shell";
import { PublicPlans } from "@/components/public-plans";
import { MelfyFeatures } from "@/components/melfy-features";
import lifeImage from "@/assets/melfy-life.jpg";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Melfy — O seu dinheiro, com mais clareza" },
    { name: "description", content: "Organize entradas, despesas, contas e metas em meticais. Conheça os planos Melfy Pessoal e Pessoal Avançado e adira." },
    { property: "og:title", content: "Melfy — O seu dinheiro, com mais clareza" },
    { property: "og:description", content: "Finanças pessoais em meticais. Conheça o Melfy e escolha o seu plano." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});
function HomePage() {
  return <PublicShell>
    <section className="melfy-hero relative isolate overflow-hidden">
      <img src={lifeImage} width={1536} height={1024} alt="Mulher a organizar as suas finanças com o telemóvel e um caderno" className="absolute inset-0 -z-20 h-full w-full object-cover" fetchPriority="high" />
      <div className="melfy-hero-wash absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-xl"><p className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><span className="h-px w-6 bg-primary" /> Menos preocupação. Mais vida.</p>
          <h1 className="text-5xl font-extrabold leading-[1.12] sm:text-6xl">Melfy<span className="text-primary">.</span><br /><span className="mt-3 block text-4xl font-bold leading-tight sm:text-5xl">O seu dinheiro,<br />com mais clareza.</span></h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Saiba para onde vai cada metical. Organize as suas contas, acompanhe os gastos e dê espaço aos seus próximos planos.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/precos">Escolher o meu plano <ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg"><Link to="/funcionalidades">Conhecer o Melfy</Link></Button></div>
          <div className="mt-7 flex flex-wrap gap-5 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="size-4 text-primary" /> A partir de 150 MT/mês</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" /> Os seus dados, privados</span></div>
        </div>
      </div>
    </section>
    <div className="border-y bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-6 text-sm sm:px-8"><p className="font-medium text-muted-foreground">Feito para a sua vida em Moçambique</p><div className="flex flex-wrap gap-7 font-bold"><span>M-Pesa</span><span>e-Mola</span><span>Bancos</span><span className="text-primary">Metical · MT</span></div></div></div>
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8"><div className="mb-12 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Tudo mais simples</p><h2 className="mt-4 text-3xl font-bold sm:text-4xl">Uma vida financeira<br />mais organizada.</h2></div><Button asChild variant="link"><Link to="/funcionalidades">Ver funcionalidades <ArrowRight /></Link></Button></div><MelfyFeatures /></section>
    <section className="border-y bg-surface px-5 py-20 sm:px-8"><div className="mx-auto max-w-6xl"><div className="mb-10 text-center"><p className="text-xs font-bold uppercase tracking-widest text-primary">Invista na sua tranquilidade</p><h2 className="mt-4 text-3xl font-bold sm:text-4xl">Um plano à sua medida.</h2><p className="mt-4 text-muted-foreground">Comece pelo essencial ou tenha uma experiência completa.</p></div><PublicPlans /></div></section>
    <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center sm:px-8"><div><h2 className="text-2xl font-bold">O próximo passo começa consigo.</h2><p className="mt-3 text-muted-foreground">Dê ao seu dinheiro um lugar para se organizar.</p></div><Button asChild size="lg"><Link to="/precos">Começar com o Melfy <ArrowRight /></Link></Button></section>
  </PublicShell>;
}