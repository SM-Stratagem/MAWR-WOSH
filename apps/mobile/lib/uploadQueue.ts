import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "wosh.upload.queue";

export type PhotoType = "arrival_car" | "arrival_location" | "completion";

export type QueueItem = {
  id: string;
  uri: string;
  bookingId: string;
  type: PhotoType;
  mimeType?: string;
  attempts: number;
  createdAt: number;
};

export const MAX_ATTEMPTS = 5;

export async function loadQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(list: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // best-effort persistence
  }
}

export async function enqueue(item: Omit<QueueItem, "attempts" | "createdAt">): Promise<void> {
  const list = await loadQueue();
  list.push({ ...item, attempts: 0, createdAt: Date.now() });
  await saveQueue(list);
}

export async function dequeue(id: string): Promise<void> {
  const list = await loadQueue();
  await saveQueue(list.filter((i) => i.id !== id));
}

export async function bumpAttempts(id: string): Promise<number> {
  const list = await loadQueue();
  let attempts = 0;
  const next = list.map((i) => {
    if (i.id === id) {
      attempts = i.attempts + 1;
      return { ...i, attempts };
    }
    return i;
  });
  await saveQueue(next);
  return attempts;
}

export async function queueForBooking(bookingId: string): Promise<QueueItem[]> {
  const list = await loadQueue();
  return list.filter((i) => i.bookingId === bookingId);
}

export function makeQueueItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
