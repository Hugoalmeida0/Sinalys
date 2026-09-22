import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
      <path d="M15.5 5.5a3.25 3.25 0 0 1 0 6.4" />
      <path d="M17.75 14a6.25 6.25 0 0 1 3.5 5.6" />
    </svg>
  );
}

export function PlaybookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <path d="M8 8h8M8 11.5h5" />
    </svg>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 3.4 1 5.2 1.7 6.2a1 1 0 0 1-.8 1.6H5.1a1 1 0 0 1-.8-1.6C5 14.2 6 12.4 6 9Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4.5" width="12" height="16" rx="1.5" />
      <path d="M9 4.5V3.75A1.25 1.25 0 0 1 10.25 2.5h3.5A1.25 1.25 0 0 1 15 3.75V4.5" />
      <path d="M9 10.5h6M9 14h6M9 17.5h4" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props} strokeWidth={2.4}>
      <circle cx="12" cy="5.2" r="0.6" fill="currentColor" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      <circle cx="12" cy="18.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.5 4h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 4 5.6 1.5 1.5 0 0 1 5.5 4Z" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2" />
      <path d="M3 4v4.5h4.5" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5" />
    </svg>
  );
}

export function FileSpreadsheetIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8h4" />
      <path d="M8.5 12h7M8.5 15h7M8.5 18h4" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3.5M12 17.5V21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M3 12h3.5M17.5 12H21M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.7 12a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4l.7-12" />
    </svg>
  );
}

export function HeartHandshakeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9.5 12.5 2 2 5-5" />
      <path d="M2.5 12.5 6 9l3 1.5-2.5 2.5L9 15.5l-2.5 2.5-4-3v-2.5Z" />
      <path d="M21.5 12.5 18 9l-3 1.5 2.5 2.5L15 15.5l2.5 2.5 4-3v-2.5Z" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11.5M7.5 11 12 15.5 16.5 11" />
      <path d="M4.5 16.5V19A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CircleCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 12.2c0 3.9-3.8 7-8.5 7a9.7 9.7 0 0 1-2.6-.35L4.5 20.5l1.2-3.3A6.6 6.6 0 0 1 3.5 12.2c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
    </svg>
  );
}

export function DollarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5v17" />
      <path d="M16 7.5H10a2.75 2.75 0 0 0 0 5.5h4a2.75 2.75 0 0 1 0 5.5H7.5" />
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-4 4.2" />
    </svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8h4" />
      <path d="M9 12.5h6M9 16h4" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6 3 3" />
    </svg>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4.5h10l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8.5 4.5v5h6v-5M8 20.5v-5h8v5" />
    </svg>
  );
}

export function PlusCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

export function UserGroupIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14a5.5 5.5 0 0 1 3 4.4" />
    </svg>
  );
}

export function MicrofoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.5M9 21.5h6" />
    </svg>
  );
}
