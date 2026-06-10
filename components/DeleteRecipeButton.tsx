"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteRecipe } from "@/utils/actions";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";

export default function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await deleteRecipe(supabase, recipeId);
    router.push("/recipes");
    router.refresh();
  }

  return (
    <>
      <Button variant="contained" color="error" onClick={() => setOpen(true)}>
        Eliminar
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>¿Eliminar receta?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción no se puede deshacer. La receta y todos sus ingredientes y pasos serán eliminados.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
