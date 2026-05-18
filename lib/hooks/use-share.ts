"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useShareTokens(recipientId: string | null) {
  return useQuery({
    queryKey: ["share-tokens", recipientId],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_tokens")
        .select("*")
        .eq("recipient_id", recipientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateShareToken(recipientId: string | null, supporterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label?: string) => {
      if (!recipientId || !supporterId) throw new Error("Missing IDs");
      const { data, error } = await supabase
        .from("share_tokens")
        .insert({ recipient_id: recipientId, created_by: supporterId, label: label ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-tokens", recipientId] });
    },
  });
}

export function useDeleteShareToken(recipientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase.from("share_tokens").delete().eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-tokens", recipientId] });
    },
  });
}
