import {readFileSync} from 'node:fs';
// Exact current main function bodies; synthetic terms only, not the full registry.
export function automaticMatchingFixtureSQL(){
 const source=readFileSync(new URL('../supabase/migrations/20261112141330_automatic_ingredient_identity_and_nutrient_evidence.sql',import.meta.url),'utf8');
 const extract=name=>{const start=source.indexOf(`CREATE FUNCTION private.${name}(`);if(start<0)throw Error('Missing current matcher function');const end=source.indexOf('$$;',start);if(end<0)throw Error('Missing function boundary');return source.slice(start,end+3);};
 return `ALTER TABLE product_ingredient_label_items ADD COLUMN IF NOT EXISTS normalized_ingredient_text text;CREATE TABLE private.material_identity_terms(term text,canonical_id uuid REFERENCES canonical_ingredients(id) ON DELETE CASCADE);`
 +['material_identity_key','material_identity_strict_key','material_base_text','match_material_label_item'].map(extract).join('\n')
 +`INSERT INTO private.material_identity_terms SELECT 'strict:'||private.material_identity_strict_key('닭고기'),id FROM canonical_ingredients WHERE status='active';CREATE TRIGGER auto_match_material BEFORE INSERT OR UPDATE ON product_ingredient_label_items FOR EACH ROW EXECUTE FUNCTION private.match_material_label_item();`;
}
