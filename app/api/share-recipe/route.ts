import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { shareRecipeEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { recipeId, recipientEmail } = await req.json();
  if (!recipeId || !recipientEmail) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (recipientEmail === user.email) {
    return NextResponse.json({ error: "No podés compartir con vos mismo" }, { status: 400 });
  }

  // Verify the recipe belongs to the caller
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, title")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .single();

  if (!recipe) return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });

  // Check the recipient exists in the platform (via service role)
  const service = createServiceClient();
  const { data: users } = await service.auth.admin.listUsers();
  const recipientExists = users?.users.some((u) => u.email === recipientEmail);
  if (!recipientExists) {
    return NextResponse.json({ error: "No existe un usuario con ese email en la plataforma" }, { status: 404 });
  }

  // Create the share record
  const { data: share, error } = await supabase
    .from("recipe_shares")
    .insert({ recipe_id: recipeId, shared_by: user.id, shared_with_email: recipientEmail })
    .select("token")
    .single();

  if (error || !share) {
    return NextResponse.json({ error: "No se pudo crear el compartido" }, { status: 500 });
  }

  // Send email
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await shareRecipeEmail({
    recipientEmail,
    senderEmail: user.email!,
    recipeName: recipe.title,
    shareUrl: `${origin}/shared/${share.token}`,
  });

  return NextResponse.json({ success: true });
}
