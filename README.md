# HopTrace

An interactive browser-based network topology visualizer and deterministic packet routing simulator. HopTrace bridges the gap between theoretical network diagrams and heavy desktop emulators, providing real-time CIDR validation, hop-by-hop packet traversal, and an integrated 3-pane Web Wireshark packet dissector.

---

## Key Features

- **Interactive Topology Canvas:** Drag-and-drop Host (L3), Switch (L2), and Router (L3 Gateway) equipment with automated link connection validation.
- **Client-Side Interface Configuration:** Slide-over drawer with real-time Zod schema validation for IPv4 octets, CIDR subnet masks, and MAC addresses.
- **Deterministic Routing Engine:** Pure TypeScript simulation of ARP resolution, same-subnet local switching, Default Gateway traversal, and TTL decrements.
- **Integrated Web Wireshark Dissector:** 3-pane deep packet inspector featuring:
  - **Packet List:** Chronological sequence of captured ARP and ICMP frames with microsecond deltas.
  - **Packet Details Tree:** Hierarchical protocol breakdown (Frame, Ethernet II, IPv4, ICMP).
  - **Hex Dump:** 16-byte aligned raw hexadecimal and ASCII byte preview.
- **Topology Presets & Portability:** Preconfigured templates (*Simple LAN*, *Dual Routed Subnet*, *Unreachable Gateway*) and JSON workspace import/export.

---

## Tech Stack

- **Framework:** React 19, TypeScript
- **Canvas / Graph:** [@xyflow/react](https://reactflow.dev/) (React Flow)
- **State Management:** Zustand
- **Schema Validation:** Zod
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest (52 passing unit tests)
- **Build & Tooling:** Vite, oxlint

---

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm / pnpm / yarn

### Installation & Run

1. Clone the repository:
   ```bash ''' git clone https://github.com/Rayda1908/HopTrace.git 

cd HopTrace
