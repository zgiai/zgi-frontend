import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 判断当前运行环境
 */
export const isDesktop = () => {
  return typeof window.ipc !== 'undefined';
};

