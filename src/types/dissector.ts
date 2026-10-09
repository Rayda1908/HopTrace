export interface DissectorField {
  label: string;
  value?: string;
  byteOffset?: number;
  byteLength?: number;
}

export interface DissectorTreeSection {
  title: string;
  fields?: DissectorField[];
  children?: DissectorTreeSection[];
}

export interface HexDumpLine {
  offset: string;
  hex: string;
  ascii: string;
  bytes: number[];
}

export interface DissectedPacket {
  no: number;
  timeSec: number;
  source: string;
  destination: string;
  protocol: 'ARP' | 'ICMP' | 'IPv4';
  length: number;
  info: string;
  summaryTree: DissectorTreeSection[];
  rawBytes: Uint8Array;
}
