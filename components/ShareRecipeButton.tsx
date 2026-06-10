"use client";

import { useState } from "react";
import { shareRecipeByEmail } from "@/utils/actions";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type Props = {
  recipeId: string;
  recipeName: string;
  variant?: "outlined" | "text" | "contained";
  size?: "small" | "medium" | "large";
};

export default function ShareRecipeButton({ recipeId, recipeName, variant = "outlined", size = "medium" }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleShare() {
    if (!email.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const { ok, data } = await shareRecipeByEmail(recipeId, email.trim());
      if (ok) {
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

  function handleClose() {
    setOpen(false);
    setEmail("");
    setResult(null);
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        Compartir
      </Button>
      <Dialog open={open} onClose={handleClose} onClick={(e) => e.stopPropagation()} fullWidth maxWidth="xs">
        <DialogTitle>Compartir &ldquo;{recipeName}&rdquo;</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Email del destinatario"
            type="email"
            placeholder="amigo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
            disabled={sending}
            size="small"
            fullWidth
          />
          {result && (
            <Typography variant="body2" color={result.ok ? "success.main" : "error.main"}>
              {result.message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleShare} disabled={sending || !email.trim()}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
