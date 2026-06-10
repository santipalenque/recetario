import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const USER_ID = "60715005-0c28-4137-ab41-4a332811c9dd";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const SYSTEM_PROMPT = `
Eres un extractor de recetas. Se te dará el contenido de una página web en markdown.
Tu tarea es extraer la receta y devolverla ÚNICAMENTE como JSON válido con esta estructura exacta:

{
  "title": "string",
  "description": "string o null",
  "servings": number o null,
  "prep_time_minutes": number o null,
  "cook_time_minutes": number o null,
  "ingredients": [
    { "name": "string", "amount": number o null, "unit": "string o null" }
  ],
  "steps": [
    { "description": "string" }
  ]
}

Si no encontrás una receta en el contenido, devuelve: { "error": "No se encontró una receta en esta URL" }
No incluyas texto fuera del JSON.
`;

// All blog post URLs (oldest to newest), excluding the 2 oldest non-recipe intro posts
const POST_URLS = [
  "https://cocinerosdealma.blogspot.com/2010/06/los-ravioles-de-la-mama.html",
  "https://cocinerosdealma.blogspot.com/2010/06/los-peroski.html",
  "https://cocinerosdealma.blogspot.com/2010/06/disfrutar-oyendo-recetas.html",
  "https://cocinerosdealma.blogspot.com/2010/06/como-cocina-la-vieja.html",
  "https://cocinerosdealma.blogspot.com/2010/07/anita-una-luchadora-que-solo-piensa-en.html",
  "https://cocinerosdealma.blogspot.com/2010/07/cristina-la-mujer-de-pablo-villanueva.html",
  "https://cocinerosdealma.blogspot.com/2010/07/juanca-un-arenero.html",
  "https://cocinerosdealma.blogspot.com/2010/07/lo-vi-en-italia.html",
  "https://cocinerosdealma.blogspot.com/2010/07/tarta-de-yogur-y-queso-blanco.html",
  "https://cocinerosdealma.blogspot.com/2010/07/una-pasta-para-sobrevivir.html",
  "https://cocinerosdealma.blogspot.com/2010/07/un-dip-con-aire-arabe.html",
  "https://cocinerosdealma.blogspot.com/2010/07/yo-misma.html",
  "https://cocinerosdealma.blogspot.com/2010/09/un-invento-delicioso-el-alioli.html",
  "https://cocinerosdealma.blogspot.com/2010/11/el-gazpachito-de-carlos.html",
  "https://cocinerosdealma.blogspot.com/2010/11/que-nunca-falte-un-chipa.html",
  "https://cocinerosdealma.blogspot.com/2010/11/raquel-reikel-para-los-amigos.html",
  "https://cocinerosdealma.blogspot.com/2010/11/tetel-siempre-con-recetas-practicas-y.html",
  "https://cocinerosdealma.blogspot.com/2010/11/torta-de-chocolate.html",
  "https://cocinerosdealma.blogspot.com/2010/12/la-torta-preferida-de-magda.html",
  "https://cocinerosdealma.blogspot.com/2011/04/mejillones-fritos.html",
  "https://cocinerosdealma.blogspot.com/2011/04/picho-mallmann.html",
  "https://cocinerosdealma.blogspot.com/2011/05/como-hace-la-tempura-maria-luisa.html",
  "https://cocinerosdealma.blogspot.com/2011/05/dos-pancitos-en-pugna-los-de-mama-y-los.html",
  "https://cocinerosdealma.blogspot.com/2011/05/el-bizcocho-de-paloma.html",
  "https://cocinerosdealma.blogspot.com/2011/05/las-croquetas-tan-espanolas.html",
  "https://cocinerosdealma.blogspot.com/2011/05/mama-hace-una-torta-de-chocolate-bien.html",
  "https://cocinerosdealma.blogspot.com/2011/05/una-quesada.html",
  "https://cocinerosdealma.blogspot.com/2011/05/una-senora-del-mercado.html",
  "https://cocinerosdealma.blogspot.com/2011/10/pan-de-pizza.html",
  "https://cocinerosdealma.blogspot.com/2012/01/budin-de-nuez.html",
  "https://cocinerosdealma.blogspot.com/2012/01/la-torta-de-manzana-de-toda-la-vida.html",
  "https://cocinerosdealma.blogspot.com/2012/02/berenjenas-en-escabeche.html",
  "https://cocinerosdealma.blogspot.com/2012/02/ensalada-de-anchoas-y-queso-de-cabra.html",
  "https://cocinerosdealma.blogspot.com/2012/02/ensalada-de-salmon-marinado-con.html",
  "https://cocinerosdealma.blogspot.com/2012/04/alcauciles-alcachofas-salteados-con.html",
  "https://cocinerosdealma.blogspot.com/2012/04/budincitos-de-todo-tipo.html",
  "https://cocinerosdealma.blogspot.com/2012/04/crumble-de-manzanas.html",
  "https://cocinerosdealma.blogspot.com/2012/04/el-mejor-cochinillo.html",
  "https://cocinerosdealma.blogspot.com/2012/04/espinacas-para-todo.html",
  "https://cocinerosdealma.blogspot.com/2012/04/garbanzos-con-arroz-al-horno.html",
  "https://cocinerosdealma.blogspot.com/2012/04/humus.html",
  "https://cocinerosdealma.blogspot.com/2012/04/mi-plato-estrella-pato-la-naranja.html",
  "https://cocinerosdealma.blogspot.com/2012/04/mmm-que-ricos-los-bocadillos-de.html",
  "https://cocinerosdealma.blogspot.com/2012/04/nunca-sabras-moria-casan-tallarines-al.html",
  "https://cocinerosdealma.blogspot.com/2012/04/panceta-crujiente.html",
  "https://cocinerosdealma.blogspot.com/2012/04/previstos-1-tarta-ordenadita-de-puerros.html",
  "https://cocinerosdealma.blogspot.com/2012/04/previstos-2-pastelitos-de-queso-con.html",
  "https://cocinerosdealma.blogspot.com/2012/04/previstos-3-batido-de-helado-de-yogur-y.html",
  "https://cocinerosdealma.blogspot.com/2012/04/salmorejo-casi-un-gazpacho-pero-mas.html",
  "https://cocinerosdealma.blogspot.com/2012/04/siempre-hacia-locro.html",
  "https://cocinerosdealma.blogspot.com/2012/04/siguiendo-con-el-limon-pollo-al-limon-y.html",
  "https://cocinerosdealma.blogspot.com/2012/05/baratito-baratito-bavarois-de-naranja.html",
  "https://cocinerosdealma.blogspot.com/2012/05/blog-post.html",
  "https://cocinerosdealma.blogspot.com/2012/05/de-mamina-la-pierna-de-cordero-la-tarta.html",
  "https://cocinerosdealma.blogspot.com/2012/05/de-st-patricks-abbey-mil-hojas-iberica.html",
  "https://cocinerosdealma.blogspot.com/2012/05/de-tapas-por-madrid.html",
  "https://cocinerosdealma.blogspot.com/2012/05/de-tapas-por-madrid-arroz-al-cava-con.html",
  "https://cocinerosdealma.blogspot.com/2012/05/de-tapas-por-madrid-del-bar-gambrinus.html",
  "https://cocinerosdealma.blogspot.com/2012/05/de-tapas-por-madrid-gemelos-home.html",
  "https://cocinerosdealma.blogspot.com/2012/05/devi-me-ensenaste-hacer-omelette.html",
  "https://cocinerosdealma.blogspot.com/2012/05/diverxo.html",
  "https://cocinerosdealma.blogspot.com/2012/05/judias-blancas-con-costillas.html",
  "https://cocinerosdealma.blogspot.com/2012/05/la-preferida-de-manu-la-torta-de-boysen.html",
  "https://cocinerosdealma.blogspot.com/2012/05/la-tapa-del-chikito-vieira-de-santiago.html",
  "https://cocinerosdealma.blogspot.com/2012/05/mis-primeros-recuerdos-culinarios.html",
  "https://cocinerosdealma.blogspot.com/2012/05/mi-tortilla-de-patatas.html",
  "https://cocinerosdealma.blogspot.com/2012/05/mousse-de-salmon-ahumado.html",
  "https://cocinerosdealma.blogspot.com/2012/05/previstos-4-unas-facturitas-deliciosas.html",
  "https://cocinerosdealma.blogspot.com/2012/05/recomenda-lugares-donde-hayas-comido.html",
  "https://cocinerosdealma.blogspot.com/2012/05/tapa-5-cazuela-de-pulpitos.html",
  "https://cocinerosdealma.blogspot.com/2012/05/tapa-6-coquete-de-pollo.html",
  "https://cocinerosdealma.blogspot.com/2012/06/el-salmon-marinado-de-berardo.html",
  "https://cocinerosdealma.blogspot.com/2012/06/otro-salmon-marinado-y-este-con-salsita.html",
  "https://cocinerosdealma.blogspot.com/2012/10/escalibada-rico-barato-y-diet.html",
  "https://cocinerosdealma.blogspot.com/2012/11/fideua.html",
  "https://cocinerosdealma.blogspot.com/2012/11/huevos-al-plato.html",
  "https://cocinerosdealma.blogspot.com/2012/12/carre-de-cerdo-con-anana-redondo-de.html",
  "https://cocinerosdealma.blogspot.com/2012/12/cocktail-de-camarones.html",
  "https://cocinerosdealma.blogspot.com/2012/12/hoy-comida-arabe-sirio-libanesa-salam.html",
  "https://cocinerosdealma.blogspot.com/2013/01/de-maria-dolores-masitas-de-frutos-rojos.html",
  "https://cocinerosdealma.blogspot.com/2013/08/las-carrilleras-de-antonio.html",
  "https://cocinerosdealma.blogspot.com/2013/08/las-comiditas-de-san-en-australia-y-bali.html",
  "https://cocinerosdealma.blogspot.com/2013/08/rincon-de-cobo.html",
  "https://cocinerosdealma.blogspot.com/2013/08/un-dia-cualquiera.html",
  "https://cocinerosdealma.blogspot.com/2013/12/panne-forte.html",
  "https://cocinerosdealma.blogspot.com/2014/03/goulash-con-spaezel-para-mis-eternas.html",
  "https://cocinerosdealma.blogspot.com/2014/03/pato-con-arandanos-y-naranja.html",
  "https://cocinerosdealma.blogspot.com/2014/12/cookies-de-nutella-o-nocilia.html",
  "https://cocinerosdealma.blogspot.com/2014/12/una-ensalada-original.html",
  "https://cocinerosdealma.blogspot.com/2015/08/me-lo-enseno-elba.html",
  "https://cocinerosdealma.blogspot.com/2015/10/una-forma-diferente-de-comer-huevos.html",
  "https://cocinerosdealma.blogspot.com/2016/01/bondiola-re-facil.html",
  "https://cocinerosdealma.blogspot.com/2016/01/la-vi-en-el-diario.html",
  "https://cocinerosdealma.blogspot.com/2016/05/bigos-una-receta-ancestral-de-alex-b.html",
  "https://cocinerosdealma.blogspot.com/2016/06/mermelada-de-naranjas-amargas.html",
  "https://cocinerosdealma.blogspot.com/2017/03/bife-de-chorizo-con-champignons.html",
  "https://cocinerosdealma.blogspot.com/2017/03/tarta-de-berenjenas-super.html",
  "https://cocinerosdealma.blogspot.com/2017/03/tarta-tarta-con-masa-de-polenta.html",
  "https://cocinerosdealma.blogspot.com/2019/02/fondeau-de-queso-en-pan-de-campo.html",
  "https://cocinerosdealma.blogspot.com/2019/02/unos-bocaditos-de-limon-de-muerte.html",
  "https://cocinerosdealma.blogspot.com/2023/09/bondiola-la-cerveza-negra-se-corta-con.html",
  "https://cocinerosdealma.blogspot.com/2023/09/hoy-probamos-este-hojaldre-de-repollo.html",
  "https://cocinerosdealma.blogspot.com/2023/09/un-sushi-de-zuchinis.html",
  "https://cocinerosdealma.blogspot.com/2024/11/canelones-de-zuchinis.html",
  "https://cocinerosdealma.blogspot.com/2025/01/calabacin-frito.html",
  "https://cocinerosdealma.blogspot.com/2025/12/ideas-para-navidad.html",
  "https://cocinerosdealma.blogspot.com/2026/06/ribs-apreciadas-por-todos-son-mejores.html",
  "https://cocinerosdealma.blogspot.com/2026/06/riquisima-es-saludable-y-sorprende.html",
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAndParse(postUrl) {
  const res = await fetch(`https://r.jina.ai/${postUrl}`);
  const markdown = await res.text();

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: markdown }],
  });

  let raw = msg.content[0].text.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(raw);
}

async function insertRecipe(recipeData, sourceUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      user_id: USER_ID,
      title: recipeData.title,
      description: recipeData.description ?? null,
      servings: recipeData.servings ?? null,
      prep_time_minutes: recipeData.prep_time_minutes ?? null,
      cook_time_minutes: recipeData.cook_time_minutes ?? null,
      source_url: sourceUrl,
      // is_public omitted — PostgREST schema cache is stale; DB default (false) applies
    }),
  });
  const rows = await res.json();
  if (!res.ok || !rows?.[0]) throw new Error(JSON.stringify(rows));
  const recipe = rows[0];

  if (recipeData.ingredients?.length) {
    await supabase.from("ingredients").insert(
      recipeData.ingredients.map((ing, idx) => ({
        recipe_id: recipe.id,
        name: ing.name,
        amount: ing.amount ?? null,
        unit: ing.unit ?? null,
        order_index: idx,
      }))
    );
  }

  if (recipeData.steps?.length) {
    await supabase.from("steps").insert(
      recipeData.steps.map((step, idx) => ({
        recipe_id: recipe.id,
        description: step.description,
        order_index: idx,
      }))
    );
  }

  return recipe.id;
}

async function main() {
  console.log(`Processing ${POST_URLS.length} posts...\n`);
  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < POST_URLS.length; i++) {
    const url = POST_URLS[i];
    process.stdout.write(`[${i + 1}/${POST_URLS.length}] ${url}\n`);
    try {
      const data = await fetchAndParse(url);

      if (data.error) {
        console.log(`  ⏭  Skipped: ${data.error}`);
        skipped++;
      } else {
        const id = await insertRecipe(data, url);
        console.log(`  ✓  "${data.title}" (${id})`);
        ok++;
      }
    } catch (err) {
      console.error(`  ✗  Error: ${err.message}`);
      failed++;
    }

    await sleep(1200);
  }

  console.log(`\n=== Done: ${ok} inserted, ${skipped} skipped, ${failed} failed ===`);
}

main();
