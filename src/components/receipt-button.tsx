import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReceiptUrl } from "@/lib/data";

export function ReceiptButton({ path }: { path: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const { data: url } = useReceiptUrl(open ? path : null);
  if (!path) return null;
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Ver foto" onClick={() => setOpen(true)}>
        <ImageIcon className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Foto anexada</DialogTitle>
          {url ? (
            <img src={url} alt="Comprovativo ou compra" className="max-h-[70vh] w-full rounded-lg object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
