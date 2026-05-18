"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import { useCareRecipients, useCreateRecipient } from "@/lib/hooks/use-meal-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/lib/database.types";

export function RecipientSelector() {
  const { user } = useAuthStore();
  const { selectedRecipient, setSelectedRecipient } = useRecipientStore();
  const { data: recipients, isLoading } = useCareRecipients(user?.id ?? null);
  const createRecipient = useCreateRecipient(user?.id ?? null);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const data = await createRecipient.mutateAsync(newName.trim());
    setSelectedRecipient(data);
    setShowAdd(false);
    setNewName("");
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-400">불러오는 중...</div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white border-b">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {recipients?.map((r: Tables<"care_recipients">) => (
          <button
            key={r.id}
            onClick={() => setSelectedRecipient(r)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedRecipient?.id === r.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {r.name}
          </button>
        ))}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-500 hover:bg-gray-200"
        >
          + 추가
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex gap-2 mt-2">
          <Input
            placeholder="수급자 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 text-sm"
            autoFocus
          />
          <Button
            type="submit"
            disabled={createRecipient.isPending || !newName.trim()}
            className="h-9 px-3 text-sm"
          >
            추가
          </Button>
        </form>
      )}
    </div>
  );
}
