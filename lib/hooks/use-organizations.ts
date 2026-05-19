"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

type OrgMember = Tables<"org_members"> & {
  supporters?: { id: string; name: string } | null;
};

export function useMyOrganization(supporterId: string | null) {
  return useQuery({
    queryKey: ["my-org", supporterId],
    enabled: !!supporterId,
    queryFn: async () => {
      const { data: sup } = await supabase
        .from("supporters")
        .select("organization_id, organizations(id, name)")
        .eq("id", supporterId!)
        .maybeSingle();

      if (!sup?.organization_id) return null;
      return sup.organizations as { id: string; name: string } | null;
    },
  });
}

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<OrgMember[]> => {
      const { data, error } = await supabase
        .from("org_members")
        .select("*, supporters(id, name)")
        .eq("org_id", orgId!);
      if (error) throw error;
      return data as OrgMember[];
    },
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc("create_organization", { p_name: name });
      if (error) throw error;
      const result = data as { org_id?: string; error?: string };
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-org"] });
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
  });
}

export function useJoinOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await supabase.rpc("join_organization", { p_org_id: orgId });
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string };
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-org"] });
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
  });
}

export function useRemoveOrgMember(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("org_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
  });
}

export function useMyOrgRole(orgId: string | null, supporterId: string | null) {
  return useQuery({
    queryKey: ["my-org-role", orgId, supporterId],
    enabled: !!orgId && !!supporterId,
    queryFn: async () => {
      const { data } = await supabase
        .from("org_members")
        .select("role")
        .eq("org_id", orgId!)
        .eq("supporter_id", supporterId!)
        .maybeSingle();
      return (data?.role ?? null) as "admin" | "member" | null;
    },
  });
}
