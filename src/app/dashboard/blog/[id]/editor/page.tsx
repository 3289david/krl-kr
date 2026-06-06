"use client";
import { use } from "react";
import EditorPage from "./[postId]/page";

export default function NewPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  // Pass params without postId so editor treats it as a new post
  const newParams = Promise.resolve({ id: resolved.id, postId: undefined as unknown as string });
  return <EditorPage params={newParams} />;
}
