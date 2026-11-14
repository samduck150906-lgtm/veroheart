BEGIN;
SET LOCAL lock_timeout='3s';
-- A captured public manufacturer document is evidence of raw label contents,
-- independently of trait matching, quantitative adequacy or safety approval.
CREATE TABLE public.ingredient_label_source_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_url text NOT NULL CHECK(source_url ~ '^https://'),
 document_sha256 text NOT NULL CHECK(document_sha256 ~ '^[a-f0-9]{64}$'),
 observed_at timestamptz NOT NULL,
 raw_label_text text NOT NULL CHECK(length(btrim(raw_label_text))>0),
 ordered_items jsonb NOT NULL CHECK(jsonb_typeof(ordered_items)='array' AND jsonb_array_length(ordered_items) BETWEEN 1 AND 100),
 evidence_note text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_url,document_sha256)
);
CREATE TABLE public.ingredient_label_source_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 label_item_id uuid NOT NULL REFERENCES public.product_ingredient_label_items(id) ON DELETE CASCADE,
 source_document_id uuid NOT NULL REFERENCES public.ingredient_label_source_documents(id) ON DELETE RESTRICT,
 label_revision text NOT NULL CHECK(label_revision ~ '^[a-f0-9]{64}$'),
 item_revision text NOT NULL CHECK(item_revision ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(label_item_id,source_document_id,label_revision,item_revision)
);
CREATE INDEX ingredient_label_source_observations_document ON public.ingredient_label_source_observations(source_document_id);
CREATE INDEX ingredient_current_label_source ON public.product_ingredient_label_sets(source_reference) WHERE is_current;
ALTER TABLE public.ingredient_label_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_label_source_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ingredient_label_source_documents,public.ingredient_label_source_observations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.ingredient_label_source_documents,public.ingredient_label_source_observations TO anon,authenticated,service_role;
GRANT INSERT ON public.ingredient_label_source_documents,public.ingredient_label_source_observations TO service_role;
-- Only previously observed public manufacturer documents belong in this table;
-- no account identifiers, private package-photo paths or signed URLs are stored.
CREATE POLICY public_manufacturer_document_read ON public.ingredient_label_source_documents FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_source_label_read ON public.ingredient_label_source_observations FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.product_ingredient_label_items i
   JOIN public.product_ingredient_label_sets l ON l.id=i.label_set_id
   JOIN public.products p ON p.id=l.product_id WHERE i.id=label_item_id AND l.is_current));

CREATE FUNCTION public.label_source_evidence(item public.product_ingredient_label_items) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('verified',true,'sourceUrl',d.source_url,'observedAt',d.observed_at)
 FROM public.ingredient_label_source_observations o
 JOIN public.ingredient_label_source_documents d ON d.id=o.source_document_id
 JOIN public.product_ingredient_label_sets l ON l.id=item.label_set_id AND l.is_current
 WHERE o.label_item_id=item.id
 AND o.label_revision=encode(sha256(convert_to(jsonb_build_array(l.id,l.product_id,l.raw_label_text,l.source_reference)::text,'UTF8')),'hex')
 AND o.item_revision=encode(sha256(convert_to(jsonb_build_array(item.id,item.display_order,item.raw_ingredient_text)::text,'UTF8')),'hex')
 ORDER BY d.observed_at DESC,o.id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.label_source_evidence(public.product_ingredient_label_items) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.label_source_evidence(public.product_ingredient_label_items) TO anon,authenticated,service_role;

CREATE FUNCTION private.record_matching_label_source_items(label_id uuid,document_id uuid,item_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.ingredient_label_source_observations(label_item_id,source_document_id,label_revision,item_revision)
 SELECT i.id,d.id,
 encode(sha256(convert_to(jsonb_build_array(l.id,l.product_id,l.raw_label_text,l.source_reference)::text,'UTF8')),'hex'),
 encode(sha256(convert_to(jsonb_build_array(i.id,i.display_order,i.raw_ingredient_text)::text,'UTF8')),'hex')
 FROM public.ingredient_label_source_documents d
 JOIN public.product_ingredient_label_sets l ON l.is_current
   AND l.source_reference=d.source_url AND l.raw_label_text=d.raw_label_text
 JOIN public.product_ingredient_label_items i ON i.label_set_id=l.id
 WHERE (label_id IS NULL OR l.id=label_id) AND (document_id IS NULL OR d.id=document_id) AND (item_id IS NULL OR i.id=item_id)
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.ordered_items) x
   WHERE (x->>'order')::integer=i.display_order AND x->>'raw'=i.raw_ingredient_text)
 ON CONFLICT DO NOTHING
$$;
CREATE FUNCTION private.attach_matching_label_source() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='ingredient_label_source_documents' THEN
   PERFORM private.record_matching_label_source_items(NULL,NEW.id,NULL);
 ELSIF TG_TABLE_NAME='product_ingredient_label_sets' THEN
   IF NEW.is_current THEN PERFORM private.record_matching_label_source_items(NEW.id,NULL,NULL); END IF;
 ELSE PERFORM private.record_matching_label_source_items(NEW.label_set_id,NULL,NEW.id);
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.record_matching_label_source_items(uuid,uuid,uuid),private.attach_matching_label_source()
 FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER attach_matching_label_source AFTER INSERT ON public.ingredient_label_source_documents
 FOR EACH ROW EXECUTE FUNCTION private.attach_matching_label_source();
CREATE TRIGGER attach_matching_label_source AFTER INSERT OR UPDATE OF raw_ingredient_text,display_order,label_set_id ON public.product_ingredient_label_items
 FOR EACH ROW EXECUTE FUNCTION private.attach_matching_label_source();
CREATE TRIGGER attach_matching_label_source AFTER UPDATE OF is_current,raw_label_text,source_reference ON public.product_ingredient_label_sets
 FOR EACH ROW EXECUTE FUNCTION private.attach_matching_label_source();
