"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cloneSharedRecipe } from "@/app/actions";

export default function CloneSharedRecipeButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClone() {
    startTransition(async () => {
      await cloneSharedRecipe(token);
      setDone(true);
    });
  }

  return (
    <Button onClick={handleClone} disabled={isPending || done}>
      {isPending ? "Agregando..." : done ? "Agregada" : "Agregar a mis recetas"}
    </Button>
  );
}
