"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { getCurrentSession } from "@/lib/user";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { getReview, postReview, ReviewItem } from "@/lib/review";

function initials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ReviewTab(
  { campaignId }: { campaignId: number }
) {
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const data = await getReview(campaignId);
    setReview(data);
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getReview(campaignId);
        if (!cancelled) {
          setReview(data);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load comments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  async function submitComment(parentId: number, text: string) {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const session = await getCurrentSession();
      if (!session) {
        setUnauthenticated(true);
        return;
      }

      await postReview(campaignId, text.trim());
      setNewComment("");
      await loadComments();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not post comment."
      );
    } finally {
      setSubmitting(false);
    }
  }


  const renderReview = (item: ReviewItem) => (
    <div key={item.ID} className="flex items-start gap-3.5 py-2">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-slate-100 text-slate-500 text-xs font-medium">
          {initials(item.User?.Name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 leading-none">
            {item.User?.Name ?? "Unknown"}
          </span>
          <span className="text-xs text-slate-400 font-normal leading-none">
            {item.CreatedAt.split("T")[0]}
          </span>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed font-normal">
          {item.Comment}
        </p>
      </div>
    </div>
  );

  return (
      <div className="w-full ">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Comments <span className="text-muted-foreground font-normal">
            ({review.length})
            </span>
        </h2>

        {unauthenticated ? (
          <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            Please sign in to post a review.
          </p>
        ) : (
          <div className="flex gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-muted">YOU</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-17.5 text-sm resize-none"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => submitComment(0, newComment)}
                  disabled={!newComment.trim() || submitting}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Comment
                </Button>
              </div>
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
            </div>
          </div>
        )}

        <Separator className="my-6" />
          {loading ? (
              <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                Loading reviews…
              </p>
            ) : loadError ? (
              <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                {loadError}
              </p>
            ) : review.length === 0 ? (
              <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                No Review.
              </p>
            ) : (
              <div>
                {review.map((item) => renderReview(item))}
              </div>
            )}
    </div>
  )
}
