import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { RecipeWithDetails } from "@/lib/types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import DeleteRecipeButton from "@/components/DeleteRecipeButton";
import CloneRecipeButton from "@/components/CloneRecipeButton";
import ShareRecipeButton from "@/components/ShareRecipeButton";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, ingredients(*), steps(*)")
    .eq("id", id)
    .single();

  if (!recipe) notFound();

  const r = recipe as RecipeWithDetails;
  const isOwner = r.user_id === user.id;
  const ingredients = [...r.ingredients].sort((a, b) => a.order_index - b.order_index);
  const steps = [...r.steps].sort((a, b) => a.order_index - b.order_index);
  const totalTime = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Button component={Link} href={isOwner ? "/recipes" : "/explore"} variant="text">
            ← Volver
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            {isOwner ? (
              <>
                <ShareRecipeButton recipeId={id} recipeName={r.title} />
                <Button component={Link} href={`/recipes/${id}/edit`} variant="outlined">
                  Editar
                </Button>
                <DeleteRecipeButton recipeId={id} />
              </>
            ) : (
              <CloneRecipeButton recipeId={id} />
            )}
          </Box>
        </Box>

        {/* Image */}
        {r.image_url && (
          <Box
            component="img"
            src={r.image_url}
            alt={r.title}
            sx={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 2 }}
          />
        )}

        {/* Title & meta */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{r.title}</Typography>
            {r.is_public && <Chip label="Pública" color="success" variant="outlined" size="small" />}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {r.servings && <Chip label={`${r.servings} porciones`} size="small" />}
            {r.prep_time_minutes && <Chip label={`Prep: ${r.prep_time_minutes} min`} size="small" />}
            {r.cook_time_minutes && <Chip label={`Cocción: ${r.cook_time_minutes} min`} size="small" />}
            {totalTime > 0 && <Chip label={`Total: ${totalTime} min`} size="small" color="primary" />}
          </Box>
          {r.description && (
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>{r.description}</Typography>
          )}
          {r.source_url && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <a href={r.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "#1976d2" }}>
                Ver receta original
              </a>
            </Typography>
          )}
        </Box>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>Ingredientes</Typography>
            <Box component="ul" sx={{ m: 0, pl: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0.5 }}>
              {ingredients.map((ing) => (
                <Box component="li" key={ing.id} sx={{ display: "flex", gap: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>
                    {ing.amount && `${ing.amount} `}{ing.unit && `${ing.unit} `}
                  </Typography>
                  <Typography>{ing.name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>Preparación</Typography>
            <Box component="ol" sx={{ m: 0, pl: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
              {steps.map((step, idx) => (
                <Box component="li" key={step.id} sx={{ display: "flex", gap: 2 }}>
                  <Typography color="text.secondary" sx={{ minWidth: 24, fontWeight: 'bold' }}>
                    {idx + 1}.
                  </Typography>
                  <Typography>{step.description}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

      </Box>
    </Container>
  );
}
