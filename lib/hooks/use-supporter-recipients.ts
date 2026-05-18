"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useSupporterRecipients(recipientId: string | null) {
  return useQuery({
    queryKey: ["supporter-recipients", recipientId],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supporter_recipients")
        .select("*, supporters(id, name)")
        .eq("recipient_id", recipientId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInviteCode(recipientId: string | null, supporterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!recipientId || !supporterId) throw new Error("Missing IDs");
      const { data, error } = await supabase
        .from("invite_codes")
        .insert({
          recipient_id: recipientId,
          created_by: supporterId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invite-codes", recipientId] });
    },
  });
}

export function useActiveInviteCodes(recipientId: string | null) {
  return useQuery({
    queryKey: ["invite-codes", recipientId],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("recipient_id", recipientId!)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("accept_invite", { p_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-recipients"] });
    },
  });
}

export function useRemoveSupporterFromRecipient(recipientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (srId: string) => {
      const { error } = await supabase.from("supporter_recipients").delete().eq("id", srId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supporter-recipients", recipientId] });
    },
  });
}
