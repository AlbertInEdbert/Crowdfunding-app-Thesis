"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GoogleButton from "./share/GoogleButton";
import { Separator } from "./ui/separator";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof formSchema>;

export default function SignupForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? data?.message ?? "Could not create account");
      }

      window.location.href = "/sign-in";
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function onReset() {
    form.reset();
    form.clearErrors();
    setSubmitError(null);
  }

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-900">
      <form onSubmit={form.handleSubmit(onSubmit)} onReset={onReset} className="space-y-6 @container">
        <div className="grid grid-cols-12 gap-4">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field className="col-span-12 flex flex-col gap-2 items-start" data-invalid={fieldState.invalid}>
                <FieldLabel className="w-auto font-medium text-slate-700">Name</FieldLabel>
                <Input
                  placeholder="Full name"
                  type="text"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus-visible:ring-slate-400"
                  {...field}
                />
                {fieldState.invalid && <FieldError className="text-red-600 text-xs" errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field className="col-span-12 flex flex-col gap-2 items-start" data-invalid={fieldState.invalid}>
                <FieldLabel className="w-auto font-medium text-slate-700">Email</FieldLabel>
                <Input
                  placeholder="Email address"
                  type="email"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus-visible:ring-slate-400"
                  {...field}
                />
                {fieldState.invalid && <FieldError className="text-red-600 text-xs" errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field className="col-span-12 flex flex-col gap-2 items-start" data-invalid={fieldState.invalid}>
                <FieldLabel className="w-auto font-medium text-slate-700">Password</FieldLabel>
                <Input
                  placeholder="Password (min 8 characters)"
                  type="password"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus-visible:ring-slate-400"
                  {...field}
                />
                {fieldState.invalid && <FieldError className="text-red-600 text-xs" errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field className="col-span-12 flex flex-col gap-2 items-start" data-invalid={fieldState.invalid}>
                <FieldLabel className="w-auto font-medium text-slate-700">Confirm Password</FieldLabel>
                <Input
                  placeholder="Repeat your password"
                  type="password"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus-visible:ring-slate-400"
                  {...field}
                />
                {fieldState.invalid && <FieldError className="text-red-600 text-xs" errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {submitError && (
            <p className="col-span-12 text-red-600 text-sm">{submitError}</p>
          )}

          <div className="col-span-12 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </div>

          <div className="col-span-12 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground shrink-0">OR</span>
            <Separator className="flex-1" />
          </div>

          <div className="col-span-12">
            <GoogleButton onClick={handleGoogleLogin} label="Sign up with Google" />
          </div>
          <div className="col-span-12 flex items-center gap-4">
            <FieldDescription className="text-center">
              Already have an account? <a href="/sign-in">Sign in</a>
            </FieldDescription>
          </div>
        </div>
      </form>
    </div>
  );
}
