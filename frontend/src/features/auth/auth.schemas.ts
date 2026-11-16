import { z } from "zod";

const email = z.string().trim().pipe(z.email("Enter a valid email address"));

export const loginFormSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const registerFormSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
