import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import RecipeCard from "@/components/RecipeCard";
import RecipeSearch from "@/components/RecipeSearch";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let recipes: Recipe[] = [];

  if (query) {
    const { data: ingredientMatches } = await supabase
      .from("ingredients")
      .select("recipe_id")
      .ilike("name", `%${query}%`);

    const ingredientIds = (ingredientMatches ?? []).map((i) => i.recipe_id);

    let dbQuery = supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ingredientIds.length > 0) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,id.in.(${ingredientIds.join(",")})`);
    } else {
      dbQuery = dbQuery.ilike("title", `%${query}%`);
    }

    const { data } = await dbQuery;
    recipes = (data as Recipe[]) ?? [];
  } else {
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });
    recipes = (data as Recipe[]) ?? [];
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Mis recetas</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Link href="/explore"><Button variant="outlined">Explorar</Button></Link>
          <Link href="/recipes/new"><Button variant="contained">+ Nueva receta</Button></Link>
          <form action="/auth/logout" method="POST">
            <Button variant="outlined" type="submit">Salir</Button>
          </form>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Suspense>
          <RecipeSearch />
        </Suspense>
      </Box>

      {recipes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10 }}>
          {query ? (
            <Typography color="text.secondary">
              No se encontraron recetas para <strong>&ldquo;{query}&rdquo;</strong>.
            </Typography>
          ) : (
            <>
              <Typography color="text.secondary" sx={{ mb: 2 }}>Todavía no tenés recetas.</Typography>
              <Link href="/recipes/new"><Button variant="contained">Crear mi primera receta</Button></Link>
            </>
          )}
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} showShare />
          ))}
        </Box>
      )}
    </Container>
  );
}
