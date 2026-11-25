-- TravelSpend: gastos USD / MXN con equivalente en USD.
-- Ejecutar en Supabase > SQL Editor, después de setup.sql.
-- Aditivo: no borra movimientos ni altera sus importes existentes.
-- Solo la cuenta owner mantiene acceso gracias a las reglas RLS existentes.

BEGIN;

ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS original_amount_cents integer;

ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS fx_rate_usd_mxn numeric(14,7);

ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS fx_rate_date date;

ALTER TABLE public.personal_expenses
  DROP CONSTRAINT IF EXISTS personal_expenses_currency_data_valid;

ALTER TABLE public.personal_expenses
  ADD CONSTRAINT personal_expenses_currency_data_valid CHECK (
    currency IN ('USD','MXN')
    AND (
      (currency = 'USD'
        AND (original_amount_cents IS NULL OR original_amount_cents = amount_cents)
        AND fx_rate_usd_mxn IS NULL
        AND fx_rate_date IS NULL)
      OR
      (currency = 'MXN'
        AND original_amount_cents IS NOT NULL
        AND original_amount_cents <> 0
        AND abs(original_amount_cents) <= 100000000
        AND (original_amount_cents > 0) = (amount_cents > 0)
        AND fx_rate_usd_mxn IS NOT NULL
        AND fx_rate_usd_mxn > 0
        AND fx_rate_date IS NOT NULL)
    )
  );

COMMIT;

-- Verificación: deben mostrarse cuatro columnas.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personal_expenses'
  AND column_name IN ('currency','original_amount_cents','fx_rate_usd_mxn','fx_rate_date')
ORDER BY column_name;
