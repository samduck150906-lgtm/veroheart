import { readFile,writeFile } from 'node:fs/promises';
import { parseIngredientLabelItems } from '../supabase/functions/_shared/labelIngredientParser.ts';

// Preserve the date/hash of the previous observed manufacturer document. This
// transformation does not claim a fresh fetch or a safety/whole-label approval.
const audit=JSON.parse(await readFile(new URL('../data/enrichment/qa-source-review-2026-11-09.json',import.meta.url),'utf8'));
const sources=audit.accepted.filter(source=>source.ingredientsText&&/^[a-f0-9]{64}$/.test(source.htmlHash)).map(source=>({
 source_url:source.sourceUrl,source_text:source.ingredientsText,source_hash:source.htmlHash,
 observed_at:source.checkedAt,items:parseIngredientLabelItems(source.ingredientsText).map(item=>({order:item.order,raw:item.rawText})),
}));
const schema=await readFile(new URL('./label-source-observation-schema.sql',import.meta.url),'utf8');
const serialized=JSON.stringify(sources);
if(serialized.includes('$label_sources$'))throw new Error('SQL delimiter appears in source data');
const sql=schema+`\n-- BEGIN GENERATED SOURCE LABEL DOCUMENTS
WITH sources AS (SELECT * FROM jsonb_to_recordset($label_sources$${serialized}$label_sources$::jsonb)
 AS s(source_url text,source_text text,source_hash text,observed_at timestamptz,items jsonb))
INSERT INTO public.ingredient_label_source_documents(source_url,document_sha256,observed_at,raw_label_text,ordered_items,evidence_note)
 SELECT s.source_url,s.source_hash,s.observed_at,s.source_text,s.items,
 'Manufacturer document captured on the stored observed date with its original document hash and ordered raw items. Product confirmation requires exact source URL, full raw label and ordered item text. Not safety or nutritional adequacy. Manufacturer web information may differ from the local package label.'
 FROM sources s
 ON CONFLICT DO NOTHING;
-- END GENERATED SOURCE LABEL DOCUMENTS
NOTIFY pgrst,'reload schema';
COMMIT;
`;
await writeFile(process.argv[2]??new URL('../.artifacts/label-source-observation-seed.sql',import.meta.url),sql);
console.log(JSON.stringify({sourceDocuments:sources.length,orderedItems:sources.reduce((sum,source)=>sum+source.items.length,0)}));
