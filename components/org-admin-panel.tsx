"use client";

import { useState } from "react";
import { Building2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMyOrganization,
  useOrgMembers,
  useCreateOrganization,
  useJoinOrganization,
  useRemoveOrgMember,
  useMyOrgRole,
} from "@/lib/hooks/use-organizations";
import { useAuthStore } from "@/lib/auth-store";

export function OrgAdminPanel() {
  const { user } = useAuthStore();
  const supporterId = user?.id ?? null;

  const { data: org } = useMyOrganization(supporterId);
  const { data: members = [] } = useOrgMembers(org?.id ?? null);
  const { data: myRole } = useMyOrgRole(org?.id ?? null, supporterId);
  const createOrg = useCreateOrganization();
  const joinOrg = useJoinOrganization();
  const removeOrgMember = useRemoveOrgMember(org?.id ?? null);

  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");

  if (!supporterId) return null;

  if (!org) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold">새 복지관 만들기</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="복지관 이름"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <Button
              size="sm"
              onClick={() =>
                createOrg.mutate(orgName.trim(), { onSuccess: () => setOrgName("") })
              }
              disabled={!orgName.trim() || createOrg.isPending}
            >
              만들기
            </Button>
          </div>
          {createOrg.isError && (
            <p className="text-sm text-destructive">만들기 실패. 다시 시도해주세요.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">기존 복지관 참여하기</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="복지관 ID"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => joinOrg.mutate(orgId.trim(), { onSuccess: () => setOrgId("") })}
              disabled={!orgId.trim() || joinOrg.isPending}
            >
              참여
            </Button>
          </div>
          {joinOrg.isError && (
            <p className="text-sm text-destructive">참여 실패. ID를 확인해주세요.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{org.name}</p>
          <p className="truncate text-xs text-muted-foreground">ID: {org.id}</p>
        </div>
        {myRole === "admin" && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            관리자
          </span>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">팀원 ({members.length}명)</p>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">팀원이 없어요</p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((m) => {
              const sup = m.supporters as { id: string; name: string } | null;
              const isMe = m.supporter_id === supporterId;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-2.5"
                >
                  <span className="flex-1 text-sm font-semibold">
                    {sup?.name ?? "알 수 없음"}
                    {isMe && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                  {myRole === "admin" && !isMe && (
                    <button
                      onClick={() => removeOrgMember.mutate(m.id)}
                      aria-label="팀원 제거"
                      className="rounded-lg p-1.5 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {myRole === "admin" && (
        <div className="rounded-xl border border-dashed border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="h-4 w-4" />
            <span>팀원에게 복지관 ID를 공유해서 초대하세요</span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(org.id)}
            className="mt-2 w-full rounded-lg bg-secondary px-3 py-1.5 font-mono text-xs text-foreground hover:bg-accent"
          >
            {org.id}
          </button>
        </div>
      )}
    </div>
  );
}
