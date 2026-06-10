import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { RecipeWithDetails } from "@/lib/types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CloneSharedRecipeButton from "@/components/CloneSharedRecipeButton";

export default async function SharedRecipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/shared/${token}`);

  const service = createServiceClient();

  const { data: share } = await service
    .from("recipe_shares")
    .select("recipe_id, shared_by, shared_with_email")
    .eq("token", token)
    .single();

  if (!share) notFound();

  const { data: recipe } = await service
    .from("recipes")
    .select("*, ingredients(*), steps(*)")
    .eq("id", share.recipe_id)
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
          <Link href="/recipes"><Button variant="text">← Mis recetas</Button></Link>
          {!isOwner && <CloneSharedRecipeButton token={token} />}
        </Box>

        {!isOwner && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
            <Typography variant="body2" color="text.secondary">
              Alguien compartió esta receta con vos. Podés agregarla a tu recetario con el botón de arriba.
            </Typography>
          </Paper>
        )}

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
          <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 'bold' }}>{r.title}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {r.servings && <Chip label={`${r.servings} porciones`} size="small" />}
            {r.prep_time_minutes && <Chip label={`Prep: ${r.prep_time_minutes} min`} size="small" />}
            {r.cook_time_minutes && <Chip label={`Cocción: ${r.cook_time_minutes} min`} size="small" />}
            {totalTime > 0 && <Chip label={`Total: ${totalTime} min`} size="small" color="primary" />}
          </Box>
          {r.description && (
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>{r.description}</Typography>
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
