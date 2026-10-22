"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";

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
import { Company, createCompany, CreateCompanyInput, getCompanyByUserId } from "@/lib/company";
import { getCurrentSession } from "@/lib/user";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";


export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});

  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const selectedFile = e.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [fieldName]: selectedFile }));
  };

  const [companyInputForm, setCompanyInputForm] = useState<CreateCompanyInput>({
    name: '',
    description : '',
    categoryId : ''
    
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof CreateCompanyInput>(
    key: K,
    value: CreateCompanyInput[K]
  ) => {
    setCompanyInputForm((prev) => ({ ...prev, [key]: value }));
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
        try {
          const data = await getCompanyByUserId(session.UserID);
          if (!cancelled) {
            setCompany(data);
            setHasCompany(true);
          }
        } catch {
          
        }
        try {
          const cats = await getCategory(100, 0);
          if (!cancelled) setCategories(cats);
          console.log(cats)
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      const session = await getCurrentSession();
      if (!session) {
        setUnauthenticated(true);
        return;
      }

      const created = await createCompany(
        companyInputForm,
        [files.akta, files.sk, files.nib, files.npwp].filter(
          (f): f is File => f !== null
        )
      );
      setCompany(created);
      setHasCompany(true);
      router.push(`/company`)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not create company."
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">

        <h1 className="text-2xl font-semibold tracking-tight">Create Company</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Register company</CardTitle>
            </div>
            <CardDescription>
              A company is required before you can create a campaign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  value={companyInputForm.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-description">Description</Label>
                <Textarea
                  id="company-description"
                  value={companyInputForm.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What does your company do?"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-document">Document Legalitas Perusahaan</Label>
                <Separator className="bg-neutral-300" />
                <div className="mt-2 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="doc1">Akta Pendirian Perusahaan</Label>
                    {files.akta && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded: {files.akta.name}
                      </span>
                    )}
                  </div>
                  <Input accept=".pdf,.png,.jpg,.jpeg" id="doc1" type="file" onChange={(e) => handleFileChange(e, "akta")} />
                </div>

                <div className="mt-2 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="doc2">Surat Keputusan</Label>
                    {files.sk && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded: {files.sk.name}
                      </span>
                    )}
                  </div>
                  <Input accept=".pdf,.png,.jpg,.jpeg" id="doc2" type="file" onChange={(e) => handleFileChange(e, "sk")} />
                </div>
                
                <div className="mt-2 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="doc3">NIB (Nomor Induk Berusaha)</Label>
                    {files.nib && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded: {files.nib.name}
                      </span>
                    )}
                  </div>
                  <Input accept=".pdf,.png,.jpg,.jpeg" id="doc3" type="file" onChange={(e) => handleFileChange(e, "nib")} />
                </div>

              <div className="mt-2 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="doc4">NPWP badan usaha</Label>
                  {files.npwp && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded: {files.npwp.name}
                    </span>
                  )}
                </div>
                <Input accept=".pdf,.png,.jpg,.jpeg" id="doc4" type="file" onChange={(e) => handleFileChange(e, "npwp")} />
              </div>

              </div>
              <div className="flex flex-col gap-2">
                <Label>Category</Label>
                <Select value={companyInputForm.categoryId} onValueChange={value => updateField("categoryId",value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Categories</SelectLabel>
                        {categories.map((item) => (
                        <SelectItem key={item.CategoryID} value={String(item.CategoryID)}>
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
              <div>
                <Button type="submit" disabled={submitting || !companyInputForm.name.trim()} >
                  {submitting ? "Registering…" : "Register company"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </main>
  );
}
