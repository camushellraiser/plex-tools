-- TravelSpend: tarjetas BBVA Dorada y Santander Free.
-- Ejecutar UNA VEZ (es seguro repetirlo) en Supabase > SQL Editor del proyecto TravelSpend.
-- Este cambio no borra gastos ni modifica importes o fechas.
-- NO cambia permisos RLS, autenticación ni los datos de Irlanda.

BEGIN;

ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS card_name text NOT NULL DEFAULT '';

ALTER TABLE public.personal_expenses
  DROP CONSTRAINT IF EXISTS personal_expenses_card_name_valid;

ALTER TABLE public.personal_expenses
  ADD CONSTRAINT personal_expenses_card_name_valid
  CHECK (
    card_name IN ('', 'bbva_dorada', 'santander_free')
    AND (payment = 'card' OR card_name = '')
  );

COMMIT;

-- Comprobación: debe mostrar card_name con tipo text.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personal_expenses'
  AND column_name = 'card_name';
