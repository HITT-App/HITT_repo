-- Let a reporter retract their own report (and enables smoke-test cleanup).
CREATE POLICY "report_delete_own" ON public.content_reports
  FOR DELETE USING (auth.uid() = reporter_id);
