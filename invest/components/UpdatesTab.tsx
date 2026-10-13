"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Pencil, Send, Trash2, X } from "lucide-react";
import { getCurrentSession } from "@/lib/user";
import { getCompanyByUserId } from "@/lib/company";
import {
  CampaignUpdate,
  createUpdate,
  deleteUpdate,
  getCampaignUpdates,
  updateUpdate,
} from "@/lib/updates";
import { formatDate } from "@/lib/investment";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function UpdatesTab({
  campaignId,
  companyId,
}: {
  campaignId: number;
  companyId: number;
}) {
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const loadUpdates = useCallback(async () => {
    const data = await getCampaignUpdates(campaignId);
    setUpdates(
      [...(data ?? [])].sort(
        (a, b) =>
          new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
      )
    );
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCampaignUpdates(campaignId);
        if (!cancelled) {
          setUpdates(
            [...(data ?? [])].sort(
              (a, b) =>
                new Date(b.CreatedAt).getTime() -
                new Date(a.CreatedAt).getTime()
            )
          );
        }
      } catch {
        if (!cancelled) setLoadError("Could not load updates.");
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const session = await getCurrentSession();
        if (!session) return;
        const company = await getCompanyByUserId(session.UserID);
        if (!cancelled && company.ID === companyId) setIsOwner(true);
      } catch {
        
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, companyId]);

  async function submitUpdate() {
    if (!newTitle.trim() || !newContent.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createUpdate(campaignId, newTitle.trim(), newContent.trim());
      setNewTitle("");
      setNewContent("");
      await loadUpdates();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not post update."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: CampaignUpdate) {
    setEditingId(item.ID);
    setEditTitle(item.Title);
    setEditContent(item.Content);
    setSubmitError(null);
  }

  async function submitEdit(id: number) {
    if (!editTitle.trim() || !editContent.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateUpdate(id, editTitle.trim(), editContent.trim());
      setEditingId(null);
      await loadUpdates();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not edit update."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDelete(id: number) {
    if (submitting) return;
    if (!window.confirm("Delete this update?")) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await deleteUpdate(id);
      await loadUpdates();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not delete update."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const renderUpdate = (item: CampaignUpdate) => (
    <div key={item.ID} className="relative flex gap-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Megaphone className="h-4 w-4" />
      </span>

      <div className="flex-1 space-y-1">
        {editingId === item.ID ? (
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Update title"
              className="text-sm"
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="What's new?"
              className="min-h-17.5 text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(null)}
                disabled={submitting}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => submitEdit(item.ID)}
                disabled={!editTitle.trim() || !editContent.trim() || submitting}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 leading-none">
                {item.Title}
              </span>
              <span className="text-xs text-slate-400 font-normal leading-none">
                {formatDate(item.CreatedAt)}
              </span>
              {isOwner && (
                <span className="ml-auto flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit update"
                    onClick={() => startEdit(item)}
                    className="h-7 w-7 text-slate-400 hover:text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete update"
                    onClick={() => submitDelete(item.ID)}
                    disabled={submitting}
                    className="h-7 w-7 text-slate-400 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
              {item.Content}
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <h2 className="text-base font-semibold text-foreground mb-4">
        Updates{" "}
        <span className="text-muted-foreground font-normal">
          ({updates.length})
        </span>
      </h2>

      {isOwner && (
        <div className="space-y-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Update title (e.g. We hit 50% funding!)"
            className="text-sm"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Share progress with your investors..."
            className="min-h-17.5 text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={submitUpdate}
              disabled={!newTitle.trim() || !newContent.trim() || submitting}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Post update
            </Button>
          </div>
        </div>
      )}
      {submitError && <p className="mt-2 text-sm text-destructive">{submitError}</p>}

      <Separator className="my-6" />

      {loading ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          Loading updates…
        </p>
      ) : loadError ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          {loadError}
        </p>
      ) : updates.length === 0 ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          No updates yet.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {updates.map((item) => renderUpdate(item))}
        </div>
      )}
    </div>
  );
}
