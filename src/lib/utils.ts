import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const slimeSpring = { type: "spring", stiffness: 400, damping: 12, mass: 0.8, bounce: 0.6 };
