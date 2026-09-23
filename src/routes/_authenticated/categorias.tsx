import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories, useDeleteRow, useSaveCategory, useTransactions } from "@/lib/data";
import { money, num } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — Meu Financeiro" },
      { name: "description", content: "Organize as suas entradas e despesas por categoria." },
      { property: "og:title", content: "Categorias — Meu Financeiro" },
      {
        property: "og:description",
        content: "Organize as suas entradas e despesas por categoria.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const save = useSaveCategory();
  const del = useDeleteRow("categories");

  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [formKind, setFormKind] = useState<"expense" | "income">("expense");

  const list = categories.filter((c) => c.kind === kind);

  function openNew() {
    setEditId(undefined);
    setName("");
    setFormKind(kind);
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Total gasto e número de transações por categoria"
        action={
          <Button className="gap-2" onClick={openNew}>
            <Plus className="size-4" /> Nova categoria
          </Button>
        }
      />

      <Tabs value={kind} onValueChange={(v) => setKind(v as "expense" | "income")}>
        <TabsList>
          <TabsTrigger value="expense">Despesas</TabsTrigger>
          <TabsTrigger value="income">Entradas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const rows = transactions.filter((t) => t.category_id === c.id);
          const total = rows.reduce((s, t) => s + num(t.amount), 0);
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="tnum mt-1 text-sm text-muted-foreground">
                    {money(total)} · {rows.length} transação(ões)
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar"
                    onClick={() => {
                      setEditId(c.id);
                      setName(c.name);
                      setFormKind(c.kind as "expense" | "income");
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar"
                    className="text-destructive"
                    onClick={() => {
                      if (rows.length > 0) {
                        toast.error("Esta categoria tem transações associadas.");
                        return;
                      }
                      del.mutate(c.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formKind} onValueChange={(v) => setFormKind(v as "expense" | "income")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!name.trim() || save.isPending}
              onClick={async () => {
                await save.mutateAsync({ id: editId, name: name.trim(), kind: formKind });
                toast.success("Categoria guardada.");
                setOpen(false);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
