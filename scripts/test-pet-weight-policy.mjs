import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('actual SQL rejects unsupported writes and preserves historical pet records', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA private; CREATE TABLE public.pets(id int PRIMARY KEY, name text, pet_type text CHECK(pet_type IN ('dog','cat')), weight numeric(5,2));
      INSERT INTO public.pets VALUES (1,'legacy','dog',999);`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261117090000_pet_weight_input_limits.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('SELECT weight FROM public.pets WHERE id=1')).rows[0].weight, '999.00');
    await db.exec("UPDATE public.pets SET name='preserved profile' WHERE id=1");
    for (const [species, weight] of [['dog',999],['cat',31],['dog',0],['cat',-1],['dog','NaN']]) {
      await assert.rejects(db.query('INSERT INTO public.pets VALUES(2,$1,$2,$3)', ['fixture',species,weight]), /pet_weight_out_of_supported_range/);
    }
    await assert.rejects(db.exec('UPDATE public.pets SET weight=999 WHERE id=1'), /pet_weight_out_of_supported_range/);
    await db.exec("INSERT INTO public.pets VALUES(2,'decimal','cat',4.25),(3,'optional','dog',null),(4,'limit','dog',150),(5,'limit','cat',30)");
    await db.exec('UPDATE public.pets SET weight=6.8 WHERE id=1');
    assert.equal((await db.query('SELECT weight FROM public.pets WHERE id=1')).rows[0].weight, '6.80');
  } finally { await db.close(); }
});
