CREATE TABLE IF NOT EXISTS public.candidate_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_candidate_created
  ON public.candidate_notifications (candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_candidate_unread
  ON public.candidate_notifications (candidate_id, is_read, created_at DESC);

ALTER TABLE public.candidate_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'candidate_notifications'
      AND policyname = 'candidate_notifications_select_own'
  ) THEN
    CREATE POLICY candidate_notifications_select_own
      ON public.candidate_notifications
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.candidates c
          WHERE c.id = candidate_notifications.candidate_id
            AND c.auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'candidate_notifications'
      AND policyname = 'candidate_notifications_update_own'
  ) THEN
    CREATE POLICY candidate_notifications_update_own
      ON public.candidate_notifications
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.candidates c
          WHERE c.id = candidate_notifications.candidate_id
            AND c.auth_user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.candidates c
          WHERE c.id = candidate_notifications.candidate_id
            AND c.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT ON public.candidate_notifications TO authenticated;
GRANT UPDATE (is_read) ON public.candidate_notifications TO authenticated;

