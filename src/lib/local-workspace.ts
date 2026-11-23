import { IndexedDbProvider } from "@/lib/storage";

const database = new IndexedDbProvider("wealth-os-workspace", "records");
const workspacePrefix = "wealth-os:workspace:";
const filePrefix = "wealth-os:file:";
const maximumBackupBytes = 100 * 1024 * 1024;

export type LocalRole = "Admin" | "Adviser" | "Client";
export type LocalPersonStatus = "Active" | "Onboarding" | "Inactive";

export interface LocalPerson {
  id: string;
  name: string;
  email: string;
  role: LocalRole;
  status: LocalPersonStatus;
  adviserId?: string;
  phone?: string;
  createdAt: string;
}

export interface LocalHolding {
  id: string;
  clientId: string;
  name: string;
  assetClass: string;
  valueMinor: number;
  currency: string;
  valuedAt: string;
}

export interface LocalTransaction {
  id: string;
  clientId: string;
  date: string;
  description: string;
  type: string;
  amountMinor: number;
  currency: string;
}

export interface LocalGoal {
  id: string;
  clientId: string;
  name: string;
  targetMinor: number;
  currentMinor: number;
  currency: string;
  targetDate: string;
  updatedAt: string;
}

export interface LocalTask {
  id: string;
  clientId: string;
  title: string;
  dueDate: string;
  status: "Open" | "Complete";
  createdAt: string;
}

export interface LocalNote {
  id: string;
  clientId: string;
  adviserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalDocument {
  id: string;
  clientId: string;
  name: string;
  category: string;
  mimeType: string;
  size: number;
  fileId: string;
  createdAt: string;
}

export interface LocalSupportRequest {
  id: string;
  clientId: string;
  message: string;
  createdAt: string;
  status: "Open" | "Closed";
}

export interface LocalWorkspaceSettings {
  firmName: string;
  primaryColour: string;
  accentColour: string;
  contactEmail: string;
}

export const localWorkspaceKeys = {
  settings: "settings",
  people: "people",
  holdings: "holdings",
  transactions: "transactions",
  goals: "goals",
  tasks: "tasks",
  notes: "notes",
  documents: "documents",
  support: "support",
} as const;

export const defaultLocalWorkspaceSettings: LocalWorkspaceSettings = {
  firmName: "",
  primaryColour: "#12243a",
  accentColour: "#b89136",
  contactEmail: "",
};

function workspaceKey(key: string) {
  return `${workspacePrefix}${key}`;
}

export async function readWorkspaceValue<T>(key: string) {
  return (await database.get(workspaceKey(key))) as T | null;
}

export async function writeWorkspaceValue<T>(key: string, value: T) {
  await database.set(workspaceKey(key), value);
}

export async function readWorkspaceFile(fileId: string) {
  const value = await database.get(`${filePrefix}${fileId}`);
  return value instanceof Blob ? value : null;
}

export async function writeWorkspaceFile(fileId: string, file: Blob) {
  await database.set(`${filePrefix}${fileId}`, file);
}

export async function removeWorkspaceFile(fileId: string) {
  await database.remove(`${filePrefix}${fileId}`);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function createWorkspaceBackup() {
  const entries = (await database.entries()).filter(([key]) =>
    key.startsWith(workspacePrefix) || key.startsWith(filePrefix),
  );
  const records = await Promise.all(entries.map(async ([key, value]) => {
    if (value instanceof Blob) {
      return {
        key,
        value: {
          kind: "blob",
          mimeType: value.type,
          base64: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
        },
      };
    }
    return { key, value };
  }));
  const backup = {
    format: "wealth-os-local-workspace",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    records,
  };
  const serialized = JSON.stringify(backup);
  if (new Blob([serialized]).size > maximumBackupBytes) {
    throw new Error("The workspace backup exceeds the 100 MB export limit.");
  }
  return serialized;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStrings(value: unknown, fields: string[]) {
  return isObject(value) && fields.every((field) => typeof value[field] === "string");
}

function isValidWorkspaceCollection(key: string, value: unknown) {
  if (key === localWorkspaceKeys.settings) {
    return hasStrings(value, ["firmName", "primaryColour", "accentColour", "contactEmail"]);
  }
  if (!Array.isArray(value) || value.length > 100_000) return false;
  const requiredStrings: Record<string, string[]> = {
    [localWorkspaceKeys.people]: ["id", "name", "email", "role", "status", "createdAt"],
    [localWorkspaceKeys.holdings]: ["id", "clientId", "name", "assetClass", "currency", "valuedAt"],
    [localWorkspaceKeys.transactions]: ["id", "clientId", "date", "description", "type", "currency"],
    [localWorkspaceKeys.goals]: ["id", "clientId", "name", "currency", "targetDate", "updatedAt"],
    [localWorkspaceKeys.tasks]: ["id", "clientId", "title", "dueDate", "status", "createdAt"],
    [localWorkspaceKeys.notes]: ["id", "clientId", "adviserId", "body", "createdAt", "updatedAt"],
    [localWorkspaceKeys.documents]: ["id", "clientId", "name", "category", "mimeType", "fileId", "createdAt"],
    [localWorkspaceKeys.support]: ["id", "clientId", "message", "createdAt", "status"],
  };
  const fields = requiredStrings[key];
  if (!fields || !value.every((record) => hasStrings(record, fields))) return false;
  if (key === localWorkspaceKeys.people) {
    return value.every((person) =>
      ["Admin", "Adviser", "Client"].includes(person.role) &&
      ["Active", "Onboarding", "Inactive"].includes(person.status) &&
      (person.adviserId === undefined || typeof person.adviserId === "string"),
    );
  }
  if (key === localWorkspaceKeys.holdings) return value.every((item) => Number.isSafeInteger(item.valueMinor) && item.valueMinor >= 0);
  if (key === localWorkspaceKeys.transactions) return value.every((item) => Number.isSafeInteger(item.amountMinor));
  if (key === localWorkspaceKeys.goals) {
    return value.every((item) => Number.isSafeInteger(item.targetMinor) && item.targetMinor > 0 &&
      Number.isSafeInteger(item.currentMinor) && item.currentMinor >= 0);
  }
  if (key === localWorkspaceKeys.tasks) return value.every((item) => ["Open", "Complete"].includes(item.status));
  if (key === localWorkspaceKeys.documents) return value.every((item) => Number.isSafeInteger(item.size) && item.size >= 0 && item.size <= 25 * 1024 * 1024);
  if (key === localWorkspaceKeys.support) return value.every((item) => ["Open", "Closed"].includes(item.status));
  return true;
}

export async function restoreWorkspaceBackup(serialized: string) {
  if (new Blob([serialized]).size > maximumBackupBytes) {
    throw new Error("The workspace backup exceeds the 100 MB import limit.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (!isObject(parsed) || parsed.format !== "wealth-os-local-workspace" || parsed.schemaVersion !== 1 || !Array.isArray(parsed.records)) {
    throw new Error("The selected file is not a supported WEALTH OS workspace backup.");
  }

  const keys = new Set<string>();
  const entries: Array<[string, unknown]> = [];
  const collections = new Map<string, unknown>();
  const files = new Set<string>();
  for (const record of parsed.records) {
    if (!isObject(record) || typeof record.key !== "string" ||
      (!record.key.startsWith(workspacePrefix) && !record.key.startsWith(filePrefix)) ||
      keys.has(record.key) || !("value" in record)) {
      throw new Error("The workspace backup contains an invalid or duplicate record.");
    }
    keys.add(record.key);
    let value = record.value;
    if (record.key.startsWith(filePrefix)) {
      if (!isObject(value) || value.kind !== "blob" || typeof value.mimeType !== "string" || typeof value.base64 !== "string") {
        throw new Error("The workspace backup contains an invalid document file.");
      }
      try {
        value = new Blob([base64ToBytes(value.base64)], { type: value.mimeType });
      } catch {
        throw new Error("The workspace backup contains a corrupted document file.");
      }
      if ((value as Blob).size > 25 * 1024 * 1024) throw new Error("A document in the backup exceeds the 25 MB file limit.");
      files.add(record.key.slice(filePrefix.length));
    } else {
      const collection = record.key.slice(workspacePrefix.length);
      if (!Object.values(localWorkspaceKeys).includes(collection as (typeof localWorkspaceKeys)[keyof typeof localWorkspaceKeys]) ||
        !isValidWorkspaceCollection(collection, value)) {
        throw new Error(`The workspace backup contains invalid ${collection} data.`);
      }
      collections.set(collection, value);
    }
    entries.push([record.key, value]);
  }
  const people = collections.get(localWorkspaceKeys.people);
  const peopleById = new Map(Array.isArray(people) ? people.map((person: LocalPerson) => [person.id, person]) : []);
  const clients = new Set([...peopleById.values()].filter((person) => person.role === "Client").map((person) => person.id));
  const advisers = new Set([...peopleById.values()].filter((person) => person.role === "Adviser").map((person) => person.id));
  for (const person of peopleById.values()) {
    if (person.adviserId && !advisers.has(person.adviserId)) throw new Error("A client assignment in the backup refers to a missing adviser.");
  }
  for (const key of [
    localWorkspaceKeys.holdings,
    localWorkspaceKeys.transactions,
    localWorkspaceKeys.goals,
    localWorkspaceKeys.tasks,
    localWorkspaceKeys.notes,
    localWorkspaceKeys.documents,
    localWorkspaceKeys.support,
  ]) {
    const records = collections.get(key);
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      if (!clients.has(record.clientId)) throw new Error(`A ${key} record refers to a missing client.`);
      if (key === localWorkspaceKeys.notes && !advisers.has(record.adviserId)) {
        throw new Error("An adviser note in the backup refers to a missing adviser.");
      }
      if (key === localWorkspaceKeys.documents && !files.has(record.fileId)) {
        throw new Error("A document record in the backup is missing its file.");
      }
    }
  }
  await database.replaceEntries(entries);
}

export async function resetWorkspaceData() {
  await database.replaceEntries([]);
}
