'use client'

import { useEffect, useRef, useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Label } from "../ui/label";
import { getCurrentSession, getSignOut, getUserProfile } from "@/lib/user";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useRouter, usePathname } from "next/navigation";

// Routes where the navbar should not appear (auth screens).
const HIDDEN_PATHS = ["/sign-in", "/sign-up", "/login"];

const ADMIN_ROLE_ID = 7;
const ISSUER_ROLE_ID = 8;
const INVESTOR_ROLE_ID = 9;

type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

const PUBLIC_LINKS: NavLink[] = [
  { label: "Explore", href: "/explore" },
  { label: "Learn", href: "/learn" },
];

const INVESTOR_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  // { label: "Portfolio", href: "/portfolio" },
  // { label: "Dividends", href: "/dividends" },
  { label: "Watchlist", href: "/watchlist" },
];

const ISSUER_LINKS: NavLink[] = [
    { label: "Company", href: "/company"},
    // { label: "Campaign", href: "/campaign"},
    // { label: "Campaign", href: "/campaign/new"},  
    // { label: "Approval", href: "#",children: [
    //   { label: "Company Approval", href: "/approval/company" },
    //   { label: "Campaign Approval", href: "/approval/campaign" },
    //   // { label: "Investment Approval", href: "/approval/investment" },
    // ]},
    { label: "Watchlist", href: "/watchlist" },
];

const ADMIN_LINKS: NavLink[] = [
  { label: "Approval", href: "#",children: [
    { label: "Company Approval", href: "/approval/company" },
    { label: "Campaign Approval", href: "/approval/campaign" },
    // { label: "Investment Approval", href: "/approval/investment" },
  ] },
];

function getNavLinks(roleId: number | null): NavLink[] {
  console.log(roleId)
  if (roleId === ADMIN_ROLE_ID) {
    return [...PUBLIC_LINKS, ...ADMIN_LINKS];
  }
  if (roleId === ISSUER_ROLE_ID) {
    return [...PUBLIC_LINKS, ...ISSUER_LINKS];
  }
  if (roleId === INVESTOR_ROLE_ID) {
    return [...PUBLIC_LINKS, ...INVESTOR_LINKS];
  }
  return PUBLIC_LINKS;
}

interface NavbarProps {
  roleId: number | null;
  isLoggedIn: boolean;
}

export default function Navbar({roleId, isLoggedIn }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const navLinks = getNavLinks(roleId);
  const router = useRouter();
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCurrentSession();
        
        if (!session) {
          if (!cancelled){
            setUnauthenticated(true);
          }

          return;
        }
        const data = await getUserProfile(session.UserID);
        if (!cancelled) {
          setName(data.Name);
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "Could not load your profile. Make sure the backend is running on port 8080."
          );
        }
      }

    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    try {
      await getSignOut();
      setUnauthenticated(true);
      setName("");
      window.location.href = "/explore";
    } catch {
      setLoadError("Could not sign out. Make sure the backend is running on port 8080.");
    }
  }

  const handleRedirectProfile = () => {
    router.push(`/settings`)
  }

  const pathname = usePathname();
  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/60">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-base tracking-tight">First Step</span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) =>
            link.children?.length ? (
              <li key={link.label}>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 outline-none data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900">
                    {link.label}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-max p-2">
                    {link.children.map((child) => (
                      <DropdownMenuItem key={child.label} asChild>
                        <a href={child.href}>{child.label}</a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ) : (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {link.label}
                </a>
              </li>
            )
          )}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{name}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={handleRedirectProfile}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              >
                Sign in
              </Link>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                Get started
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="inline-flex items-center justify-center rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-zinc-900 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
{/* 
      {open && (
        <div className="border-t border-zinc-200 bg-white md:hidden">
          <ul className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-3">
            {isLoggedIn ? (
              // <Link
              //   href="/dashboard"
              //   onClick={() => setOpen(false)}
              //   className="rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700"
              // >
              //   Dashboard
              // </Link>
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  Sign in
                </Link>
                <a
                  href="#start"
                  className="rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Get started
                </a>
              </>
            )}
          </div>
        </div>
      )} */}
    </header>
  );
}
