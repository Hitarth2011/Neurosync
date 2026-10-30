import React from "react";

/**
 * SVG Illustrations for NeuroSync
 * All illustrations are designed for neurodivergent children - warm, friendly, and inclusive
 */

// ─── Behavior/Cues Illustration ───────────────────────────────────────────────
export const BehaviorIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Child face */}
    <circle cx="100" cy="60" r="35" fill="#FBD38D" />

    {/* Hair */}
    <path
      d="M 65 40 Q 65 15 100 15 Q 135 15 135 40"
      fill="#B8860B"
      stroke="none"
    />

    {/* Eyes - thinking expression */}
    <circle cx="85" cy="50" r="4" fill="#2D3748" />
    <circle cx="115" cy="50" r="4" fill="#2D3748" />

    {/* Eyebrows raised */}
    <path d="M 80 44 Q 85 42 90 44" stroke="#2D3748" strokeWidth="2" fill="none" />
    <path d="M 110 44 Q 115 42 120 44" stroke="#2D3748" strokeWidth="2" fill="none" />

    {/* Mouth - curious expression */}
    <path d="M 95 65 Q 100 70 105 65" stroke="#2D3748" strokeWidth="2" fill="none" />

    {/* Sound waves from mouth */}
    <circle cx="130" cy="60" r="8" fill="none" stroke="#8DA28B" strokeWidth="1.5" opacity="0.6" />
    <circle cx="145" cy="60" r="12" fill="none" stroke="#8DA28B" strokeWidth="1.5" opacity="0.4" />

    {/* Body */}
    <rect x="80" y="100" width="40" height="35" fill="#8DA28B" rx="8" />

    {/* Arms */}
    <rect x="50" y="105" width="30" height="12" fill="#FBD38D" rx="6" />
    <rect x="120" y="105" width="30" height="12" fill="#FBD38D" rx="6" />

    {/* Legs */}
    <rect x="85" y="140" width="10" height="20" fill="#4A5568" rx="5" />
    <rect x="105" y="140" width="10" height="20" fill="#4A5568" rx="5" />
  </svg>
);

// ─── Diet/Nutrition Illustration ──────────────────────────────────────────────
export const DietIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Apple */}
    <circle cx="50" cy="70" r="20" fill="#DC2626" />
    <ellipse cx="50" cy="50" rx="4" ry="6" fill="#166534" />

    {/* Carrot */}
    <polygon points="120,50 100,70 100,90 140,90 140,70" fill="#EA8C0B" />

    {/* Broccoli */}
    <circle cx="140" cy="60" r="12" fill="#16A34A" opacity="0.8" />
    <circle cx="132" cy="50" r="10" fill="#22C55E" />
    <circle cx="148" cy="50" r="10" fill="#22C55E" />
    <rect x="137" y="70" width="6" height="15" fill="#92400E" />

    {/* Water glass */}
    <rect x="60" y="105" width="20" height="30" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" rx="2" />
    <ellipse cx="70" cy="105" rx="10" ry="4" fill="#60A5FA" opacity="0.6" />

    {/* Checkmark circle */}
    <circle cx="100" cy="135" r="18" fill="#10B981" opacity="0.7" />
    <path
      d="M 92 135 L 98 141 L 108 128"
      stroke="white"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Chat/Communication Illustration ──────────────────────────────────────────
export const ChatIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Message bubbles */}
    <rect x="30" y="30" width="90" height="40" rx="12" fill="#E8EFE8" stroke="#8DA28B" strokeWidth="1.5" />
    <polygon points="110,45 125,30 120,60" fill="#E8EFE8" />

    {/* Message text lines */}
    <line x1="40" y1="42" x2="110" y2="42" stroke="#2D3748" strokeWidth="2" opacity="0.6" />
    <line x1="40" y1="52" x2="100" y2="52" stroke="#2D3748" strokeWidth="2" opacity="0.4" />
    <line x1="40" y1="62" x2="90" y2="62" stroke="#2D3748" strokeWidth="2" opacity="0.4" />

    {/* Reply bubble */}
    <rect x="50" y="85" width="90" height="40" rx="12" fill="#F4EFE6" stroke="#C07A5E" strokeWidth="1.5" />
    <polygon points="50,95 35,110 50,115" fill="#F4EFE6" />

    {/* Reply text lines */}
    <line x1="60" y1="97" x2="130" y2="97" stroke="#2D3748" strokeWidth="2" opacity="0.6" />
    <line x1="60" y1="107" x2="120" y2="107" stroke="#2D3748" strokeWidth="2" opacity="0.4" />
    <line x1="60" y1="117" x2="110" y2="117" stroke="#2D3748" strokeWidth="2" opacity="0.4" />
  </svg>
);

// ─── Therapy/Wellness Illustration ────────────────────────────────────────────
export const TherapyIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Yoga mat */}
    <rect x="30" y="50" width="140" height="80" rx="8" fill="#A78BFA" opacity="0.2" stroke="#A78BFA" strokeWidth="2" />

    {/* Person in meditation pose */}
    {/* Head */}
    <circle cx="100" cy="45" r="15" fill="#FBD38D" />

    {/* Body cross-legged */}
    <circle cx="100" cy="75" r="18" fill="#8DA28B" />

    {/* Legs */}
    <ellipse cx="80" cy="95" rx="15" ry="12" fill="#8DA28B" />
    <ellipse cx="120" cy="95" rx="15" ry="12" fill="#8DA28B" />

    {/* Arms in peace pose */}
    <path
      d="M 82 70 Q 70 65 65 75"
      stroke="#FBD38D"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M 118 70 Q 130 65 135 75"
      stroke="#FBD38D"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
    />

    {/* Heart above */}
    <path
      d="M 100 20 C 95 15 85 15 85 23 C 85 28 90 32 100 38 C 110 32 115 28 115 23 C 115 15 105 15 100 20"
      fill="#EC4899"
    />
  </svg>
);

// ─── Teaching/Learning Illustration ───────────────────────────────────────────
export const TeachingIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Book */}
    <rect x="40" y="35" width="60" height="80" fill="#C07A5E" stroke="#8B5A3C" strokeWidth="1" rx="4" />

    {/* Book pages */}
    <line x1="70" y1="35" x2="70" y2="115" stroke="#8B5A3C" strokeWidth="1" opacity="0.5" />

    {/* Lines on page */}
    <line x1="45" y1="50" x2="65" y2="50" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />
    <line x1="45" y1="60" x2="65" y2="60" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />
    <line x1="45" y1="70" x2="65" y2="70" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />
    <line x1="45" y1="80" x2="65" y2="80" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />

    <line x1="75" y1="50" x2="95" y2="50" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />
    <line x1="75" y1="60" x2="95" y2="60" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />
    <line x1="75" y1="70" x2="95" y2="70" stroke="#F4EFE6" strokeWidth="1" opacity="0.7" />

    {/* Light bulb - learning idea */}
    <circle cx="140" cy="65" r="15" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2" />
    <rect x="135" y="80" width="10" height="8" fill="#F59E0B" rx="1" />
    <line x1="133" y1="88" x2="147" y2="88" stroke="#F59E0B" strokeWidth="2" />
    <line x1="133" y1="95" x2="147" y2="95" stroke="#F59E0B" strokeWidth="2" />
  </svg>
);

// ─── Homeschool Illustration ──────────────────────────────────────────────────
export const HomeschoolIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Desk */}
    <rect x="30" y="80" width="100" height="50" fill="#8B5A3C" rx="4" />

    {/* Desktop surface */}
    <rect x="35" y="75" width="90" height="8" fill="#A0826D" rx="2" />

    {/* Notebook */}
    <rect x="45" y="45" width="40" height="35" fill="#FBD38D" stroke="#B8860B" strokeWidth="1" rx="2" />

    {/* Notebook lines */}
    <line x1="48" y1="55" x2="82" y2="55" stroke="#B8860B" strokeWidth="0.5" opacity="0.5" />
    <line x1="48" y1="62" x2="82" y2="62" stroke="#B8860B" strokeWidth="0.5" opacity="0.5" />
    <line x1="48" y1="69" x2="82" y2="69" stroke="#B8860B" strokeWidth="0.5" opacity="0.5" />

    {/* Pencil */}
    <rect x="90" y="48" width="28" height="6" fill="#EC4899" rx="2" transform="rotate(-30 104 51)" />
    <polygon points="116,40 120,45 112,45" fill="#FCD34D" />

    {/* Cup with pencils */}
    <path
      d="M 130 85 L 128 65 L 152 65 L 150 85"
      fill="none"
      stroke="#6366F1"
      strokeWidth="2"
    />
    <ellipse cx="140" cy="85" rx="11" ry="4" fill="#6366F1" opacity="0.3" />

    {/* Pencils in cup */}
    <line x1="135" y1="85" x2="135" y2="55" stroke="#EC4899" strokeWidth="2" />
    <line x1="140" y1="85" x2="140" y2="50" stroke="#FCD34D" strokeWidth="2" />
    <line x1="145" y1="85" x2="145" y2="55" stroke="#10B981" strokeWidth="2" />
  </svg>
);

// ─── Visual Board Illustration ────────────────────────────────────────────────
export const VisualBoardIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Board background */}
    <rect x="30" y="20" width="140" height="120" fill="#F4F4F4" stroke="#999" strokeWidth="2" rx="4" />

    {/* Board tiles/cards */}
    {/* Top left */}
    <rect x="40" y="30" width="35" height="35" fill="#DC2626" rx="4" />
    <text x="57.5" y="52" textAnchor="middle" fontSize="24">
      🍎
    </text>

    {/* Top middle */}
    <rect x="82" y="30" width="35" height="35" fill="#2563EB" rx="4" />
    <text x="99.5" y="52" textAnchor="middle" fontSize="24">
      🌊
    </text>

    {/* Top right */}
    <rect x="124" y="30" width="35" height="35" fill="#F59E0B" rx="4" />
    <text x="141.5" y="52" textAnchor="middle" fontSize="24">
      ☀️
    </text>

    {/* Bottom left */}
    <rect x="40" y="72" width="35" height="35" fill="#10B981" rx="4" />
    <text x="57.5" y="94" textAnchor="middle" fontSize="24">
      🌱
    </text>

    {/* Bottom middle */}
    <rect x="82" y="72" width="35" height="35" fill="#8B5CF6" rx="4" />
    <text x="99.5" y="94" textAnchor="middle" fontSize="24">
      🎵
    </text>

    {/* Bottom right */}
    <rect x="124" y="72" width="35" height="35" fill="#EC4899" rx="4" />
    <text x="141.5" y="94" textAnchor="middle" fontSize="24">
      🎨
    </text>
  </svg>
);

// ─── Progress/Reports Illustration ────────────────────────────────────────────
export const ProgressIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Y-axis */}
    <line x1="40" y1="20" x2="40" y2="120" stroke="#2D3748" strokeWidth="2" />

    {/* X-axis */}
    <line x1="40" y1="120" x2="160" y2="120" stroke="#2D3748" strokeWidth="2" />

    {/* Bar 1 */}
    <rect x="55" y="85" width="20" height="35" fill="#10B981" rx="2" />

    {/* Bar 2 */}
    <rect x="85" y="70" width="20" height="50" fill="#3B82F6" rx="2" />

    {/* Bar 3 */}
    <rect x="115" y="45" width="20" height="75" fill="#F59E0B" rx="2" />

    {/* Bar 4 - trending up */}
    <rect x="145" y="35" width="20" height="85" fill="#EC4899" rx="2" />

    {/* Upward arrow */}
    <path
      d="M 100 15 L 100 5 M 100 5 L 95 10 M 100 5 L 105 10"
      stroke="#10B981"
      strokeWidth="2"
      fill="none"
    />

    {/* Growth star */}
    <path
      d="M 170 20 L 175 30 L 185 30 L 177 36 L 180 46 L 170 40 L 160 46 L 163 36 L 155 30 L 165 30 Z"
      fill="#FCD34D"
    />
  </svg>
);

// ─── Emergency Support Illustration ───────────────────────────────────────────
export const EmergencyIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Shield background */}
    <path
      d="M 100 15 L 150 35 L 150 85 Q 100 130 100 130 Q 100 130 50 85 L 50 35 Z"
      fill="#DC2626"
      opacity="0.2"
      stroke="#DC2626"
      strokeWidth="2"
    />

    {/* SOS text */}
    <text x="100" y="75" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#DC2626">
      SOS
    </text>

    {/* Question mark below */}
    <circle cx="100" cy="110" r="20" fill="#FECACA" stroke="#DC2626" strokeWidth="2" />
    <text x="100" y="118" textAnchor="middle" fontSize="24" fill="#DC2626">
      ?
    </text>
  </svg>
);

// ─── Empty State Illustration (General) ──────────────────────────────────────
export const EmptyStateIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Folder icon */}
    <path
      d="M 30 40 L 50 40 L 60 30 L 160 30 Q 170 30 170 40 L 170 130 Q 170 140 160 140 L 40 140 Q 30 140 30 130 Z"
      fill="#F4EFE6"
      stroke="#C07A5E"
      strokeWidth="2"
    />

    {/* Folder tab */}
    <rect x="30" y="40" width="35" height="15" fill="#E8DCCF" stroke="#C07A5E" strokeWidth="1" />

    {/* Empty indicator */}
    <circle cx="100" cy="85" r="25" fill="none" stroke="#8DA28B" strokeWidth="2" opacity="0.5" />

    {/* Magnifying glass */}
    <circle cx="100" cy="85" r="20" fill="none" stroke="#C07A5E" strokeWidth="2" />
    <line x1="115" y1="100" x2="135" y2="120" stroke="#C07A5E" strokeWidth="2" />
  </svg>
);

// ─── Loading/Skeleton Illustration ─────────────────────────────────────────────
export const LoadingIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Spinning gear 1 */}
    <g>
      <circle
        cx="80"
        cy="80"
        r="20"
        fill="none"
        stroke="#8DA28B"
        strokeWidth="3"
        opacity="0.7"
      />
      <circle cx="80" cy="80" r="8" fill="#8DA28B" />
    </g>

    {/* Spinning gear 2 */}
    <g>
      <circle
        cx="120"
        cy="80"
        r="18"
        fill="none"
        stroke="#C07A5E"
        strokeWidth="3"
        opacity="0.7"
      />
      <circle cx="120" cy="80" r="6" fill="#C07A5E" />
    </g>

    {/* Dots below */}
    <circle cx="90" cy="125" r="3" fill="#8DA28B" opacity="0.6" />
    <circle cx="100" cy="125" r="3" fill="#8DA28B" opacity="0.6" />
    <circle cx="110" cy="125" r="3" fill="#8DA28B" opacity="0.6" />
  </svg>
);

// ─── Caregiver/Support Illustration ────────────────────────────────────────────
export const CaregiverIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 160"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Adult - left side */}
    <circle cx="60" cy="40" r="12" fill="#FBD38D" />
    <rect x="50" y="55" width="20" height="30" fill="#8DA28B" rx="4" />
    <rect x="35" y="60" width="15" height="25" fill="#FBD38D" rx="3" />
    <rect x="70" y="60" width="15" height="25" fill="#FBD38D" rx="3" />
    <rect x="45" y="88" width="10" height="20" fill="#4A5568" rx="2" />
    <rect x="60" y="88" width="10" height="20" fill="#4A5568" rx="2" />

    {/* Child - right side */}
    <circle cx="140" cy="55" r="10" fill="#FBD38D" />
    <rect x="132" y="68" width="16" height="25" fill="#EC4899" rx="3" />
    <rect x="120" y="72" width="12" height="20" fill="#FBD38D" rx="2" />
    <rect x="148" y="72" width="12" height="20" fill="#FBD38D" rx="2" />
    <rect x="136" y="96" width="8" height="15" fill="#4A5568" rx="2" />
    <rect x="148" y="96" width="8" height="15" fill="#4A5568" rx="2" />

    {/* Heart between them */}
    <path
      d="M 100 55 C 95 50 85 50 85 58 C 85 63 90 67 100 73 C 110 67 115 63 115 58 C 115 50 105 50 100 55"
      fill="#EC4899"
    />

    {/* Hands holding */}
    <circle cx="125" cy="75" r="4" fill="#FBD38D" />
    <circle cx="85" cy="75" r="4" fill="#FBD38D" />
  </svg>
);
