import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MenuPreferences } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split("T")[0];
}

function buildPrompt(recipes: Record<string, unknown>[], prefs: MenuPreferences, recentIds: string[]) {
  const list = recipes.map(r => ({
    id: r.id,
    title: r.title,
    tiempo: (r.prep_time_minutes as number ?? 0) + (r.cook_time_minutes as number ?? 0) || "desconocido",
    tags: (r.tags as string[])?.join(", ") || "",
    descripcion: (r.description as string)?.slice(0, 80) || "",
  }));

  const prefLines = [
    prefs.max_time_minutes ? `- Tiempo máximo: ${prefs.max_time_minutes} min` : "- Sin límite de tiempo",
    `- Carne roja: máximo ${prefs.max_red_meat} veces`,
    `- Pescado: mínimo ${prefs.min_fish} veces`,
    `- Vegetariano: mínimo ${prefs.min_vegetarian} veces`,
    `- Carbohidratos (pasta/arroz/pan): máximo ${prefs.max_carbs} veces`,
    prefs.diet_flags.length ? `- Restricciones: ${prefs.diet_flags.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  return `Armá un menú semanal balanceado y variado (14 slots: almuerzo y cena para 7 días).

RECETAS DISPONIBLES:
${JSON.stringify(list)}

PREFERENCIAS:
${prefLines}

${recentIds.length ? `EVITAR si hay alternativas (usadas recientemente): ${recentIds.join(", ")}` : ""}

Devolvé SOLO JSON válido:
{"menu":[{"day":0,"slot":"almuerzo","recipe_id":"uuid"},{"day":0,"slot":"cena","recipe_id":"uuid"},...hasta day 6]}

Reglas: day 0=Lunes, day 6=Domingo. 14 slots exactos. Solo IDs de las recetas disponibles. Sin texto fuera del JSON.`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { preferences } = await req.json() as { preferences: MenuPreferences };

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, description, tags, prep_time_minutes, cook_time_minutes")
    .eq("user_id", user.id);

  if (!recipes?.length) {
    return NextResponse.json({ error: "No tenés recetas en tu recetario" }, { status: 400 });
  }

  let pool = recipes;
  if (preferences.max_time_minutes) {
    const filtered = recipes.filter(r => {
      const t = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
      return t === 0 || t <= preferences.max_time_minutes!;
    });
    if (filtered.length >= 10) pool = filtered;
  }

  const { data: recentMenus } = await supabase
    .from("weekly_menus")
    .select("menu_items(recipe_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(2);

  const recentIds = [...new Set(
    recentMenus?.flatMap((m: Record<string, unknown>) =>
      (m.menu_items as { recipe_id: string }[])?.map(i => i.recipe_id).filter(Boolean) ?? []
    ) ?? []
  )] as string[];

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    messages: [{ role: "user", content: buildPrompt(pool as Record<string, unknown>[], preferences, recentIds) }],
  });

  const block = msg.content.find(b => b.type === "text");
  if (!block || block.type !== "text") return NextResponse.json({ error: "Respuesta inválida del modelo" }, { status: 500 });
  let raw = block.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const { menu } = JSON.parse(raw) as { menu: { day: number; slot: string; recipe_id: string }[] };

  const validIds = new Set(pool.map(r => r.id));
  const validSlots = menu.filter(s => validIds.has(s.recipe_id));
  if (validSlots.length < 14) {
    return NextResponse.json({ error: "El modelo no pudo generar el menú completo. Intentá de nuevo." }, { status: 500 });
  }

  await supabase.from("user_menu_preferences").upsert({
    user_id: user.id, ...preferences, updated_at: new Date().toISOString(),
  });

  const { data: newMenu, error } = await supabase
    .from("weekly_menus")
    .insert({ user_id: user.id, week_start: getMondayOfCurrentWeek(), preferences })
    .select().single();

  if (error || !newMenu) return NextResponse.json({ error: "Error al guardar el menú" }, { status: 500 });

  await supabase.from("menu_items").insert(
    validSlots.map(s => ({ menu_id: newMenu.id, day: s.day, slot: s.slot, recipe_id: s.recipe_id }))
  );

  return NextResponse.json({ menuId: newMenu.id });
}
