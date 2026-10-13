"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "./ui/separator"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { CommentItem, getComment, postComment, likeComment, checkLikeComment } from "@/lib/comment";
import { getCurrentSession, Session } from "@/lib/user";
import { Company, getCompanyByCompanyId } from "@/lib/company";

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

export function CommentTab({
  campaignId,
  companyId,
}: {
  campaignId: number;
  companyId: number;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>();
  const [company, setCompany] = useState<Company | null>();
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const loadLiked = useCallback(async (data: CommentItem[], sess: Session | null) => {
    if (!sess) return;
    const results = await Promise.all(
      data.map(async (c) => {
        try {
          return (await checkLikeComment(c.ID)) ? c.ID : null;
        } catch {
          return null;
        }
      })
    );
    setLikedIds(new Set(results.filter((id): id is number => id !== null)));
  }, []);

  const loadComments = useCallback(async () => {
    const data = await getComment(campaignId);
    setComments(data);
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getComment(campaignId);
        const session = await getCurrentSession();
        const company = await getCompanyByCompanyId(companyId);
        if (!cancelled) {
          setComments(data);
          setSession(session);
          setCompany(company)
          loadLiked(data, session);
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
  }, [campaignId, companyId, loadLiked]);

  async function handleLike(id: number) {
    if (!session || likedIds.has(id)) return;
    try {
      await likeComment(id);
      setLikedIds((prev) => new Set(prev).add(id));
    } catch {
      
    }
  }

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

      await postComment(campaignId, parentId, text.trim());
      if (parentId === 0) {
        setNewComment("");
      } else {
        setDraft("");
        setReplyingTo(null);
      }
      await loadComments();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not post comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const toggleReply = (id: number) => {
    setReplyingTo((current) => (current === id ? null : id));
    setDraft("");
  };

  const topLevel = comments.filter((c) => !c.ParentID);
  const repliesFor = (id: number) =>
    comments.filter((c) => c.ParentID === id);

  const renderComment = (item: CommentItem, isReply: boolean) => (
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
          {item.Content}
        </p>

        <div className="mt-1.5 flex items-center gap-4">
           <button
             onClick={() => handleLike(item.ID)}
             className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
           >
            <Heart className={`h-3.5 w-3.5 ${likedIds.has(item.ID) ? "fill-red-500 text-red-500" : ""}`} />
            {item.Like > 0 ? item.Like : null}
          </button>
          {item.ParentID == 0 && session != null && company != null && session.UserID === company.UserID && !isReply && repliesFor(item.ID).length === 0 ?
            <button
              onClick={() => toggleReply(item.ID)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Reply
            </button> : null
          }

        </div>

        {replyingTo === item.ID && (
          <div className="mt-3 flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Reply to ${item.User?.Name ?? "this comment"}...`}
              className="min-h-15 text-sm resize-none"
              autoFocus
            />
            <div className="flex flex-col gap-1.5 justify-end">
              <Button
                size="sm"
                onClick={() => submitComment(item.ID, draft)}
                disabled={!draft.trim() || submitting}
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyingTo(null);
                  setDraft("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!isReply && repliesFor(item.ID).length > 0 && (
          <div className="mt-2 border-l-2 border-slate-100 pl-4">
            {repliesFor(item.ID).map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    </div>
  );

  return (
      <div className="w-full ">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Comments <span className="text-muted-foreground font-normal">
            ({comments.length})
            </span>
        </h2>

        {unauthenticated ? (
          <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            Please sign in to post a comment.
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
                Loading comments…
              </p>
            ) : loadError ? (
              <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                {loadError}
              </p>
            ) : comments.length === 0 ? (
              <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                No Comment.
              </p>
            ) : (
              <div>
                {topLevel.map((item) => renderComment(item, false))}
              </div>
            )}
    </div>
  )
}
