"use client";

import { useState, useTransition } from "react";
import Button from "@mui/material/Button";
import { cloneRecipe } from "@/app/actions";

export default function CloneRecipeButton({ recipeId }: { recipeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClone() {
    startTransition(async () => {
      await cloneRecipe(recipeId);
      setDone(true);
    });
  }

  return (
    <Button variant="contained" onClick={handleClone} disabled={isPending || done}>
      {isPending ? "Agregando..." : done ? "Agregada ✓" : "Agregar a mis recetas"}
    </Button>
  );
}
