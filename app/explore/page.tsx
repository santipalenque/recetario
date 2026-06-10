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

export default async function ExplorePage({
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
      .eq("is_public", true)
      .neq("user_id", user.id)
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
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false });
    recipes = (data as Recipe[]) ?? [];
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Explorar</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Recetas públicas de otros usuarios
          </Typography>
        </Box>
        <Link href="/recipes"><Button variant="outlined">Mis recetas</Button></Link>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Suspense>
          <RecipeSearch />
        </Suspense>
      </Box>

      {recipes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10 }}>
          <Typography color="text.secondary">
            {query
              ? <>No se encontraron recetas públicas para <strong>&ldquo;{query}&rdquo;</strong>.</>
              : "Todavía no hay recetas públicas de otros usuarios."}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </Box>
      )}
    </Container>
  );
}
