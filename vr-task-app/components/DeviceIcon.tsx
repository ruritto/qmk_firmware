import { Accessibility, Bike, Fish, Mountain } from "lucide-react";
import type { DeviceId } from "@/lib/types";

const ICONS = {
  climb: Mountain,
  wheelchair: Accessibility,
  fishing: Fish,
  bike: Bike,
} as const;

export default function DeviceIcon({
  device,
  size = 16,
  className,
}: {
  device: DeviceId;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[device];
  return <Icon size={size} className={className} aria-hidden />;
}
