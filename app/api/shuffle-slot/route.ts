import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { menuId, itemId } = await req.json();

  const { data: menu } = await supabase
    .from("weekly_menus")
    .select("*, menu_items(id, day, slot, recipe_id)")
    .eq("id", menuId)
    .eq("user_id", user.id)
    .single();

  if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });

  const target = (menu.menu_items as { id: string; day: number; slot: string; recipe_id: string }[])
    .find(i => i.id === itemId);
  if (!target) return NextResponse.json({ error: "Slot no encontrado" }, { status: 404 });

  const { data: allRecipes } = await supabase
    .from("recipes")
    .select("id, title, description, tags, prep_time_minutes, cook_time_minutes")
    .eq("user_id", user.id);

  if (!allRecipes?.length) return NextResponse.json({ error: "Sin recetas" }, { status: 400 });

  const prefs = menu.preferences as { max_time_minutes?: number };
  let candidates = allRecipes;
  if (prefs.max_time_minutes) {
    const filtered = allRecipes.filter(r => {
      const t = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
      return t === 0 || t <= prefs.max_time_minutes!;
    });
    if (filtered.length >= 3) candidates = filtered;
  }

  const usedIds = new Set(
    (menu.menu_items as { recipe_id: string }[]).map(i => i.recipe_id).filter(Boolean)
  );
  usedIds.delete(target.recipe_id);
  const pool = candidates.filter(r => !usedIds.has(r.id));
  const finalPool = pool.length >= 3 ? pool : candidates;

  const context = (menu.menu_items as { id: string; day: number; slot: string; recipe_id: string }[])
    .filter(i => i.id !== itemId && i.recipe_id)
    .map(i => {
      const r = allRecipes.find(r => r.id === i.recipe_id);
      return `${DAYS[i.day]} ${i.slot}: ${r?.title ?? i.recipe_id}`;
    }).join("\n");

  const prompt = `Necesito cambiar el ${target.slot} del ${DAYS[target.day]} en un menú semanal.

OPCIONES DISPONIBLES:
${JSON.stringify(finalPool.map(r => ({ id: r.id, title: r.title, tags: (r.tags as string[])?.join(", ") || "" })))}

CONTEXTO DEL MENÚ (para evitar repetir):
${context}

Elegí UNA receta variada y balanceada respecto al resto del menú.
Devolvé SOLO JSON: {"recipe_id":"uuid"}`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content.find(b => b.type === "text");
  if (!block || block.type !== "text") return NextResponse.json({ error: "Respuesta inválida" }, { status: 500 });
  let raw = block.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(raw) as { recipe_id: string };

  const validId = finalPool.some(r => r.id === parsed.recipe_id)
    ? parsed.recipe_id
    : finalPool[Math.floor(Math.random() * finalPool.length)].id;

  const { data: updatedItem } = await supabase
    .from("menu_items")
    .update({ recipe_id: validId })
    .eq("id", itemId)
    .select("*, recipe:recipes(*)")
    .single();

  return NextResponse.json({ item: updatedItem });
}
