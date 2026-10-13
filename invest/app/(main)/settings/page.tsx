"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/investment";
import {
  getCurrentSession,
  getUserProfile,
  setPassword,
  updateProfile,
  UserProfile,
} from "@/lib/user";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [password, setPasswordInput] = useState("");
  const [confirm, setConfirm] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          if (!cancelled) setUnauthenticated(true);
          return;
        }
        const data = await getUserProfile(session.UserID);
        if (!cancelled) {
          setProfile(data);
          setName(data.Name);
          setPhoneNumber(data.PhoneNumber ?? "");
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "Could not load your profile. Make sure the backend is running on port 8080."
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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const updated = await updateProfile(name.trim(), phoneNumber.trim());
      setProfile(updated);
      setSaveMessage("Profile updated.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirm) {
      setPasswordError("Passwords do not match");
      return;
    }
    setSettingPassword(true);
    try {
      await setPassword(password);
      setPasswordMessage("Password set. You can now sign in with email.");
      setPasswordInput("");
      setConfirm("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Could not set password"
      );
    } finally {
      setSettingPassword(false);
    }
  }

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to view your settings.
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
          Loading settings…
        </p>
      </main>
    );
  }

  if (loadError || !profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError ?? "Profile not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Profile Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and security.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">
              {initials(profile.Name) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold">{profile.Name}</p>
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {profile.Email}
            </p>
            <p className="text-xs text-muted-foreground">
              Member since {formatDate(profile.CreatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Your name and phone number are used on investment documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.Email} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+62…"
              />
            </div>
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {saveMessage && (
              <p className="text-sm text-green-600">{saveMessage}</p>
            )}
            <div>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Password</CardTitle>
          </div>
          <CardDescription>
            Set a password for your account. This is available for accounts
            created with Google sign-in that do not have a password yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            {passwordMessage && (
              <p className="text-sm text-green-600">{passwordMessage}</p>
            )}
            <div>
              <Button
                type="submit"
                variant="outline"
                disabled={settingPassword || !password}
              >
                {settingPassword ? "Setting password…" : "Set password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
