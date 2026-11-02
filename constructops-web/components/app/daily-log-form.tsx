"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stamp } from "@/components/ui/stamp";

const dailyLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-01."),
  summary: z.string().trim().min(2).max(500),
  details: z.string().trim().max(4000).optional(),
  weather: z.string().trim().max(120).optional(),
  crewSize: z.number().int().min(0).max(999).optional(),
});

type DailyLogFormValues = z.infer<typeof dailyLogSchema>;

export function DailyLogForm({
  projectId,
  onSubmit,
}: {
  projectId: string;
  onSubmit: (values: DailyLogFormValues & { projectId: string }) => Promise<void> | void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: { logDate: new Date().toISOString().slice(0, 10), summary: "", details: "", weather: "" },
  });

  async function handleFormSubmit(values: DailyLogFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...values, projectId });
      reset({ logDate: new Date().toISOString().slice(0, 10), summary: "", details: "", weather: "" });
    } catch (cause) {
      if (cause instanceof Error) {
        setError(cause.message);
      } else {
        setError("Failed to record log. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(handleFormSubmit)(event);
      }}
    >
      {error ? (
        <Stamp className="border-revision px-1.5 py-0.5 text-[9px] text-revision">
          {error}
        </Stamp>
      ) : null}
      <Field id="logDate" label="Date" error={errors.logDate?.message}>
        <Input type="date" {...register("logDate")} className="h-12" disabled={submitting} />
      </Field>
      <Field id="summary" label="Summary" error={errors.summary?.message}>
        <Input {...register("summary")} className="h-12" placeholder="What got done today" disabled={submitting} />
      </Field>
      <Field id="details" label="Details" error={errors.details?.message}>
        <Textarea {...register("details")} rows={3} placeholder="Notes, subcontractors, materials" disabled={submitting} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="weather" label="Weather" error={errors.weather?.message}>
          <Input {...register("weather")} className="h-12" placeholder="Sunny, 72F" disabled={submitting} />
        </Field>
        <Field id="crewSize" label="Crew size" error={errors.crewSize?.message}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            {...register("crewSize", { valueAsNumber: true })}
            className="h-12"
            disabled={submitting}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="md" loading={submitting} disabled={submitting}>
          Record log
        </Button>
      </div>
    </form>
  );
}