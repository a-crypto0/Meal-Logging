export type AddEntryOp = {
  id: string;
  type: "add_entry";
  recipientId: string;
  date: string;
  slot: string;
  food: { id: string; name: string; emoji: string };
  quantity: number;
  unit: string;
};

export type RemoveEntryOp = {
  id: string;
  type: "remove_entry";
  entryId: string;
  recipientId: string;
};

export type OfflineOp = AddEntryOp | RemoveEntryOp;

const KEY = "meal-offline-queue-v1";

function load(): OfflineOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(ops: OfflineOp[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(KEY, JSON.stringify(ops));
}

export function enqueueOp(op: OfflineOp) {
  save([...load(), op]);
}

/** Remove the most recent add_entry for a given date+slot (used when removing a temp entry). */
export function cancelLastAddOp(date: string, slot: string): boolean {
  const ops = load();
  let idx = -1;
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i];
    if (op.type === "add_entry" && op.date === date && op.slot === slot) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return false;
  ops.splice(idx, 1);
  save(ops);
  return true;
}

export function flushQueue(): OfflineOp[] {
  const ops = load();
  save([]);
  return ops;
}

export function pendingCount(): number {
  return load().length;
}
