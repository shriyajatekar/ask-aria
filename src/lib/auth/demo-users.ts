import type { DemoUser } from "./types";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "demo-raghav",
    name: "Raghav",
    email: "raghav@demo.commerce-intelligence.io",
    role: "ANALYST",
    roleLabel: "Analyst",
  },
  {
    id: "demo-yuga",
    name: "Yuga",
    email: "yuga@demo.commerce-intelligence.io",
    role: "KAM",
    roleLabel: "Key Account Manager",
  },
  {
    id: "demo-sri",
    name: "Sri",
    email: "sri@demo.commerce-intelligence.io",
    role: "CXO",
    roleLabel: "CXO",
  },
];

export function getDemoUserById(id: string): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === id);
}

export function getDemoUserByEmail(email: string): DemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email.toLowerCase() === normalized);
}

export function demoUserToSessionUser(demo: DemoUser) {
  return {
    id: demo.id,
    name: demo.name,
    email: demo.email,
    role: demo.role,
    company: "Demo workspace",
  };
}
