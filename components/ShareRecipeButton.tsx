"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  recipeId: string;
  recipeName: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
};

export default function ShareRecipeButton({ recipeId, recipeName, variant = "outline", size = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleShare() {
    if (!email.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/share-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, recipientEmail: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `Receta compartida con ${email.trim()}` });
        setEmail("");
      } else {
        setResult({ ok: false, message: data.error ?? "Error al compartir" });
      }
    } catch {
      setResult({ ok: false, message: "Error de red" });
    } finally {
      setSending(false);
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) { setEmail(""); setResult(null); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={(e) => e.stopPropagation()}>
          Compartir
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Compartir &ldquo;{recipeName}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="share-email">Email del destinatario</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="amigo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleShare()}
              disabled={sending}
            />
          </div>
          {result && (
            <p className={`text-sm ${result.ok ? "text-green-600" : "text-red-500"}`}>
              {result.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleShare} disabled={sending || !email.trim()}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
