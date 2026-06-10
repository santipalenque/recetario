import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const VALID_UNITS = ["unidades", "kg", "g", "lt", "ml", "cdas", "taza", "lata"] as const;
type Unit = (typeof VALID_UNITS)[number];

const SYSTEM_PROMPT = `Eres un extractor de recetas. Se te dará el contenido de una página web en markdown.
Tu tarea es extraer la receta y devolverla ÚNICAMENTE como JSON válido con esta estructura exacta:

{
  "title": "string",
  "description": "string o null — resumen del proceso de cocción en 2-3 oraciones",
  "servings": number o null,
  "prep_time_minutes": number o null,
  "cook_time_minutes": number o null,
  "ingredients": [
    { "name": "string", "amount": number o null, "unit": "unidades" | "kg" | "g" | "lt" | "ml" | "cdas" | "taza" | "lata" | "CN" }
  ],
  "steps": [
    { "description": "string" }
  ]
}

Reglas para ingredientes:
- Separar siempre la cantidad, la unidad y el nombre. Ejemplo: "½ kg. de Paleta" → name:"Paleta", amount:0.5, unit:"kg".
- Convertir fracciones a decimales (½→0.5, ¼→0.25, ¾→0.75).
- Las unidades válidas son SOLO: unidades, kg, g, lt, ml, cdas, taza, lata. Mapear cualquier variante a la más cercana (cucharadas→cdas, cucharaditas→cdas, litros→lt, gramos→g, kilogramos→kg, mililitros→ml, tazas→taza, latas→lata, unidad→unidades, u.→unidades).
- Si hay cantidad pero no hay unidad de medida (ej: "2 cebollas") → unit:"unidades".
- Si no hay ni cantidad ni unidad (ej: "Sal", "Aceite") → amount:null, unit:"CN".
- Para los tiempos, buscar tanto en campos explícitos como dentro del texto de los pasos (ej: "cocinar por 2 hs" → cook_time_minutes:120). Si no se menciona, usar null.
- Si no encontrás una receta en el contenido, devuelve: { "error": "No se encontró una receta en esta URL" }
- No incluyas texto fuera del JSON.`;

type ParsedIngredient = { name: string; amount: number | null; unit: string };

function normalizeIngredient(ing: ParsedIngredient): ParsedIngredient {
  if (ing.unit === "CN" || VALID_UNITS.includes(ing.unit as Unit)) return ing;
  // Fallback normalization in case Claude uses an unlisted unit
  const u = ing.unit?.toLowerCase().trim() ?? "";
  const map: Record<string, Unit> = {
    cucharada: "cdas", cucharadas: "cdas", cucharadita: "cdas", cucharaditas: "cdas",
    cda: "cdas", cdta: "cdas",
    litro: "lt", litros: "lt", l: "lt",
    gramo: "g", gramos: "g", gr: "g",
    kilogramo: "kg", kilogramos: "kg",
    mililitro: "ml", mililitros: "ml",
    tazas: "taza",
    latas: "lata",
    unidad: "unidades", "u.": "unidades", unid: "unidades",
  };
  return { ...ing, unit: map[u] ?? (ing.amount != null ? "unidades" : "CN") };
}

// Simple in-memory rate limiter: 1 request per 3 seconds per user
const lastRequest = new Map<string, number>();

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const now = Date.now();
  const last = lastRequest.get(user.id) ?? 0;
  if (now - last < 3000) {
    return NextResponse.json({ error: "Demasiadas solicitudes, esperá unos segundos" }, { status: 429 });
  }
  lastRequest.set(user.id, now);

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/markdown" },
  });
  if (!jinaRes.ok) {
    return NextResponse.json({ error: "No se pudo leer la URL" }, { status: 502 });
  }
  const raw_markdown = await jinaRes.text();
  // Strip tracking pixels, blob URLs, and base64-heavy lines before sending to Claude
  const markdown = raw_markdown
    .split("\n")
    .filter((line) => !/blob:|data:|primis\.tech|liveView\.php|base64/.test(line))
    .join("\n")
    .slice(0, 40000);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: markdown }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.ingredients)) {
      parsed.ingredients = parsed.ingredients.map(normalizeIngredient);
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "No se pudo parsear la respuesta de AI", raw },
      { status: 500 }
    );
  }
}
