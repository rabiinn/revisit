import { useState } from "react";
import type { SubmitEvent } from "react";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useCreateTask } from "./tasks.api";
import { createTaskFormSchema } from "./task.schemas";
import type { CreateTaskInput } from "./task.schemas";

type FieldErrors = Partial<Record<keyof CreateTaskInput, string>>;

export function AddTaskForm() {
  const createTask = useCreateTask();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const result = createTaskFormSchema.safeParse(Object.fromEntries(new FormData(form)));

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;

      setFieldErrors({
        title: errors.title?.[0],
        subjectName: errors.subjectName?.[0],
        estimatedMinutes: errors.estimatedMinutes?.[0],
      });

      createTask.reset();
      return;
    }

    setFieldErrors({});
    createTask.mutate(result.data, {
      onSuccess: () => {
        form.reset();

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        form.querySelector<HTMLInputElement>('input[name="title"]')?.focus;
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3">
      {createTask.error && (
        <div role="alert" className="rounded-lg bg-notice px-4 py-3 text-sm font-medium">
          {createTask.error.message}
        </div>
      )}

      <Input
        label="What will you study?"
        name="title"
        placeholder="Read chapter 8: Joins"
        autoComplete="off"
        required
        error={fieldErrors.title}
      />

      <div className="flex flex-wrap items-start gap-3">
        <Input
          label="Subject (optional)"
          name="subjectName"
          placeholder="Databases"
          autoComplete="off"
          className="min-w-0 flex-[2_1_180px]"
          error={fieldErrors.subjectName}
        />
        <Input
          label="Minutes (optional)"
          name="estimatedMinutes"
          inputMode="numeric"
          placeholder="45"
          autoComplete="off"
          className="min-w-0 flex-[1_1_120px]"
          error={fieldErrors.estimatedMinutes}
        />
      </div>

      <Button type="submit" isLoading={createTask.isPending} className="self-start">
        Add task
      </Button>
    </form>
  );
}
