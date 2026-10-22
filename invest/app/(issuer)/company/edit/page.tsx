"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Category, getCategory } from "@/lib/category";
import {
  Company,
  CreateCompanyInput,
  getCompanyByUserId,
  updateCompany,
} from "@/lib/company";
import { getCurrentSession } from "@/lib/user";

export default function EditCompanyPage() {
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateCompanyInput>({
    name: "",
    description: "",
    categoryId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof CreateCompanyInput>(
    key: K,
    value: CreateCompanyInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          if (!cancelled) setUnauthenticated(true);
          return;
        }

        let data: Company;
        try {
          data = await getCompanyByUserId(session.UserID);
        } catch {
          
          return;
        }
        if (cancelled) return;
        setCompany(data);
        setHasCompany(true);
        setForm({
          name: data.Name,
          description: data.Description,
          categoryId: data.CategoryID ? String(data.CategoryID) : "",
        });

        try {
          const cats = await getCategory(100, 0);
          if (!cancelled) setCategories(cats ?? []);
        } catch {
          
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "Could not reach the backend. Make sure it is running on port 8080."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateCompany(company.ID, {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
      });
      router.push("/company");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not update company."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to manage your company.
        </p>
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      </main>
    );
  }

  if (!hasCompany || !company) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          You do not have a company to edit yet.
        </p>
        <Button asChild>
          <Link href="/company/create">Register company</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit company</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle>{company.Name}</CardTitle>
          </div>
          <CardDescription>
            Update your company profile. Status and legal documents can only be
            changed by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="company-description">Description</Label>
              <Textarea
                id="company-description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What does your company do?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) => updateField("categoryId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    {categories.map((item) => (
                      <SelectItem
                        key={item.CategoryID}
                        value={String(item.CategoryID)}
                      >
                        {item.Name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || !form.name.trim()}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/company">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
