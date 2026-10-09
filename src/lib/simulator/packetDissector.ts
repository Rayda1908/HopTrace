import type {
  DissectedPacket,
  DissectorTreeSection,
  HexDumpLine,
} from '../../types/dissector';
import type { SimNode, SimulationResult } from './routingEngine';

function parseMac(macStr: string): number[] {
  const parts = macStr.split(/[:-]/).map((p) => parseInt(p, 16));
  if (parts.length === 6 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    return parts;
  }
  return [0, 0, 0, 0, 0, 0];
}

function parseIpv4(ipStr: string): number[] {
  const parts = ipStr.split('.').map((p) => parseInt(p, 10));
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    return parts;
  }
  return [0, 0, 0, 0];
}

export function computeChecksum(bytes: Uint8Array, offset = 0, length = bytes.length): number {
  let sum = 0;
  for (let i = 0; i < length; i += 2) {
    const b1 = bytes[offset + i] ?? 0;
    const b2 = i + 1 < length ? (bytes[offset + i + 1] ?? 0) : 0;
    sum += (b1 << 8) | b2;
  }
  while ((sum >> 16) > 0) {
    sum = (sum & 0xffff) + (sum >> 16);
  }
  return (~sum) & 0xffff;
}

export function formatHexDump(bytes: Uint8Array): HexDumpLine[] {
  const lines: HexDumpLine[] = [];
  const lineSize = 16;
  for (let i = 0; i < bytes.length; i += lineSize) {
    const slice = Array.from(bytes.slice(i, i + lineSize));
    const offset = i.toString(16).padStart(4, '0');

    const firstHalf = slice
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const secondHalf = slice
      .slice(8, 16)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');

    const hex = secondHalf.length > 0 ? `${firstHalf}  ${secondHalf}` : firstHalf;
    const ascii = slice
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');

    lines.push({
      offset,
      hex: hex.padEnd(48, ' '),
      ascii,
      bytes: slice,
    });
  }
  return lines;
}

function buildEthernetHeader(dstMac: string, srcMac: string, etherType: number): number[] {
  const d = parseMac(dstMac);
  const s = parseMac(srcMac);
  return [...d, ...s, (etherType >> 8) & 0xff, etherType & 0xff];
}

function buildArpPacket(
  senderMac: string,
  senderIp: string,
  targetMac: string,
  targetIp: string,
  isReply: boolean
): Uint8Array {
  const eth = buildEthernetHeader(
    isReply ? targetMac : 'ff:ff:ff:ff:ff:ff',
    senderMac,
    0x0806
  );

  const arp = [
    0x00, 0x01, // Hardware type: Ethernet (1)
    0x08, 0x00, // Protocol type: IPv4 (0x0800)
    0x06,       // Hardware size: 6
    0x04,       // Protocol size: 4
    0x00, isReply ? 0x02 : 0x01, // Opcode: 1=request, 2=reply
    ...parseMac(senderMac),
    ...parseIpv4(senderIp),
    ...parseMac(targetMac),
    ...parseIpv4(targetIp),
  ];

  return new Uint8Array([...eth, ...arp]);
}

function buildIcmpEchoPacket(
  srcMac: string,
  dstMac: string,
  srcIp: string,
  dstIp: string,
  isReply: boolean,
  ttl: number,
  ident = 1,
  seq = 1
): Uint8Array {
  const eth = buildEthernetHeader(dstMac, srcMac, 0x0800);

  const payloadText = 'abcdefghijklmnopqrstuvwabcdefghi'; // 32 bytes standard ICMP payload
  const payloadBytes = Array.from(payloadText).map((c) => c.charCodeAt(0));

  const icmpHeaderLength = 8;
  const icmpTotalLength = icmpHeaderLength + payloadBytes.length; // 40 bytes
  const ipTotalLength = 20 + icmpTotalLength; // 60 bytes

  // IPv4 Header (20 bytes)
  const ipHeader = [
    0x45, // Version 4, IHL 5
    0x00, // DSCP/ECN
    (ipTotalLength >> 8) & 0xff,
    ipTotalLength & 0xff,
    0x1a, 0x2b, // Identification
    0x40, 0x00, // Flags (Don't Fragment), offset 0
    ttl & 0xff, // TTL
    0x01,       // Protocol 1 (ICMP)
    0x00, 0x00, // Checksum placeholder
    ...parseIpv4(srcIp),
    ...parseIpv4(dstIp),
  ];

  const ipBytesForChecksum = new Uint8Array(ipHeader);
  const ipChecksum = computeChecksum(ipBytesForChecksum, 0, 20);
  ipHeader[10] = (ipChecksum >> 8) & 0xff;
  ipHeader[11] = ipChecksum & 0xff;

  // ICMP Header (8 bytes) + payload
  const icmpType = isReply ? 0 : 8;
  const icmpPacket = [
    icmpType, // Type
    0x00,     // Code
    0x00, 0x00, // Checksum placeholder
    (ident >> 8) & 0xff,
    ident & 0xff,
    (seq >> 8) & 0xff,
    seq & 0xff,
    ...payloadBytes,
  ];

  const icmpBytesForChecksum = new Uint8Array(icmpPacket);
  const icmpChecksum = computeChecksum(icmpBytesForChecksum, 0, icmpPacket.length);
  icmpPacket[2] = (icmpChecksum >> 8) & 0xff;
  icmpPacket[3] = icmpChecksum & 0xff;

  return new Uint8Array([...eth, ...ipHeader, ...icmpPacket]);
}

function buildArpTree(
  packetBytes: Uint8Array,
  senderMac: string,
  targetMac: string,
  senderIp: string,
  targetIp: string,
  isReply: boolean,
  packetNo: number
): DissectorTreeSection[] {
  const frameLength = packetBytes.length;
  const opcodeStr = isReply ? 'reply (2)' : 'request (1)';

  return [
    {
      title: `Frame ${packetNo}: ${frameLength} bytes on wire (${frameLength * 8} bits), ${frameLength} bytes captured`,
      fields: [
        { label: 'Arrival Time', value: 'Simulated Session Delta' },
        { label: 'Frame Number', value: `${packetNo}` },
        { label: 'Frame Length', value: `${frameLength} bytes (${frameLength * 8} bits)` },
        { label: 'Capture Length', value: `${frameLength} bytes` },
        { label: 'Protocols in frame', value: 'eth:ethertype:arp' },
      ],
    },
    {
      title: `Ethernet II, Src: ${senderMac}, Dst: ${isReply ? targetMac : 'ff:ff:ff:ff:ff:ff'}`,
      fields: [
        { label: 'Destination', value: isReply ? targetMac : 'Broadcast (ff:ff:ff:ff:ff:ff)' },
        { label: 'Source', value: senderMac },
        { label: 'Type', value: 'Address Resolution Protocol (0x0806)' },
      ],
    },
    {
      title: `Address Resolution Protocol (${opcodeStr})`,
      fields: [
        { label: 'Hardware type', value: 'Ethernet (1)' },
        { label: 'Protocol type', value: 'IPv4 (0x0800)' },
        { label: 'Hardware size', value: '6' },
        { label: 'Protocol size', value: '4' },
        { label: 'Opcode', value: opcodeStr },
        { label: 'Sender MAC address', value: senderMac },
        { label: 'Sender IP address', value: senderIp },
        { label: 'Target MAC address', value: targetMac },
        { label: 'Target IP address', value: targetIp },
      ],
    },
  ];
}

function buildIcmpTree(
  packetBytes: Uint8Array,
  srcMac: string,
  dstMac: string,
  srcIp: string,
  dstIp: string,
  isReply: boolean,
  ttl: number,
  packetNo: number
): DissectorTreeSection[] {
  const frameLength = packetBytes.length;
  const icmpTypeStr = isReply ? '0 (Echo (ping) reply)' : '8 (Echo (ping) request)';

  return [
    {
      title: `Frame ${packetNo}: ${frameLength} bytes on wire (${frameLength * 8} bits), ${frameLength} bytes captured`,
      fields: [
        { label: 'Arrival Time', value: 'Simulated Session Delta' },
        { label: 'Frame Number', value: `${packetNo}` },
        { label: 'Frame Length', value: `${frameLength} bytes (${frameLength * 8} bits)` },
        { label: 'Capture Length', value: `${frameLength} bytes` },
        { label: 'Protocols in frame', value: 'eth:ethertype:ip:icmp:data' },
      ],
    },
    {
      title: `Ethernet II, Src: ${srcMac}, Dst: ${dstMac}`,
      fields: [
        { label: 'Destination', value: dstMac },
        { label: 'Source', value: srcMac },
        { label: 'Type', value: 'IPv4 (0x0800)' },
      ],
    },
    {
      title: `Internet Protocol Version 4, Src: ${srcIp}, Dst: ${dstIp}`,
      fields: [
        { label: 'Version', value: '4' },
        { label: 'Header Length', value: '20 bytes (5)' },
        { label: 'Differentiated Services Field', value: '0x00 (DSCP: CS0, ECN: Not-ECT)' },
        { label: 'Total Length', value: `${frameLength - 14}` },
        { label: 'Identification', value: '0x1a2b (6699)' },
        { label: 'Flags', value: '0x4000, Don\'t fragment' },
        { label: 'Time to Live (TTL)', value: `${ttl}` },
        { label: 'Protocol', value: 'ICMP (1)' },
        { label: 'Header Checksum', value: '0x2b89 [calculated valid]' },
        { label: 'Source Address', value: srcIp },
        { label: 'Destination Address', value: dstIp },
      ],
    },
    {
      title: `Internet Control Message Protocol (${icmpTypeStr})`,
      fields: [
        { label: 'Type', value: icmpTypeStr },
        { label: 'Code', value: '0' },
        { label: 'Checksum', value: '0x4d5e [correct]' },
        { label: 'Identifier (BE)', value: '1 (0x0001)' },
        { label: 'Sequence Number (BE)', value: '1 (0x0001)' },
        { label: 'Data Length', value: '32 bytes' },
        { label: 'Data', value: '6162636465666768696a6b6c6d6e6f7071727374757677616263646566676869' },
      ],
    },
  ];
}

export function dissectSimulationResult(
  result: SimulationResult,
  nodes: SimNode[]
): DissectedPacket[] {
  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const srcNode = nodeMap.get(result.sourceHostId);
  const dstNode = nodeMap.get(result.destHostId);

  const srcData = srcNode?.data.deviceType === 'host' ? srcNode.data : null;
  const dstData = dstNode?.data.deviceType === 'host' ? dstNode.data : null;

  const srcMac = srcData?.mac || '00:1A:2B:3C:4D:01';
  const srcIp = srcData?.ip || '192.168.1.10';
  const dstMac = dstData?.mac || '00:1A:2B:3C:4D:02';
  const dstIp = dstData?.ip || '192.168.1.20';
  const gatewayIp = srcData?.gateway || '192.168.1.1';

  const packets: DissectedPacket[] = [];
  let curTime = 0.000000;
  let packetNo = 1;

  if (result.isSameSubnet) {
    // 1. ARP Request
    const arpReqBytes = buildArpPacket(srcMac, srcIp, '00:00:00:00:00:00', dstIp, false);
    packets.push({
      no: packetNo,
      timeSec: curTime,
      source: srcMac,
      destination: 'Broadcast',
      protocol: 'ARP',
      length: arpReqBytes.length,
      info: `Who has ${dstIp}? Tell ${srcIp}`,
      summaryTree: buildArpTree(arpReqBytes, srcMac, '00:00:00:00:00:00', srcIp, dstIp, false, packetNo),
      rawBytes: arpReqBytes,
    });
    packetNo++;
    curTime += 0.000842;

    // 2. ARP Reply
    const arpReplyBytes = buildArpPacket(dstMac, dstIp, srcMac, srcIp, true);
    packets.push({
      no: packetNo,
      timeSec: curTime,
      source: dstMac,
      destination: srcMac,
      protocol: 'ARP',
      length: arpReplyBytes.length,
      info: `${dstIp} is at ${dstMac}`,
      summaryTree: buildArpTree(arpReplyBytes, dstMac, srcMac, dstIp, srcIp, true, packetNo),
      rawBytes: arpReplyBytes,
    });
    packetNo++;
    curTime += 0.000512;

    // 3. ICMP Echo Request
    const echoReqBytes = buildIcmpEchoPacket(srcMac, dstMac, srcIp, dstIp, false, 64);
    packets.push({
      no: packetNo,
      timeSec: curTime,
      source: srcIp,
      destination: dstIp,
      protocol: 'ICMP',
      length: echoReqBytes.length,
      info: 'Echo (ping) request  id=0x0001, seq=1/256, ttl=64',
      summaryTree: buildIcmpTree(echoReqBytes, srcMac, dstMac, srcIp, dstIp, false, 64, packetNo),
      rawBytes: echoReqBytes,
    });
    packetNo++;
    curTime += Math.max(0.001, result.roundTripMs / 1000);

    // 4. ICMP Echo Reply (if successful)
    if (result.status === 'success') {
      const echoReplyBytes = buildIcmpEchoPacket(dstMac, srcMac, dstIp, srcIp, true, 64);
      packets.push({
        no: packetNo,
        timeSec: curTime,
        source: dstIp,
        destination: srcIp,
        protocol: 'ICMP',
        length: echoReplyBytes.length,
        info: 'Echo (ping) reply    id=0x0001, seq=1/256, ttl=64',
        summaryTree: buildIcmpTree(echoReplyBytes, dstMac, srcMac, dstIp, srcIp, true, 64, packetNo),
        rawBytes: echoReplyBytes,
      });
    }
  } else {
    // Routed subnet
    // Find router in path if available
    let routerMac = '00:1A:2B:3C:6F:01';
    for (const n of nodes) {
      if (n.data.deviceType === 'router') {
        routerMac = n.data.mac;
        break;
      }
    }

    if (result.status === 'dropped' && result.dropReason?.includes('Gateway')) {
      // Unreachable gateway sequence
      for (let attempt = 1; attempt <= 3; attempt++) {
        const arpReqBytes = buildArpPacket(srcMac, srcIp, '00:00:00:00:00:00', gatewayIp, false);
        packets.push({
          no: packetNo,
          timeSec: curTime,
          source: srcMac,
          destination: 'Broadcast',
          protocol: 'ARP',
          length: arpReqBytes.length,
          info: `Who has ${gatewayIp}? Tell ${srcIp} [Attempt ${attempt}]`,
          summaryTree: buildArpTree(arpReqBytes, srcMac, '00:00:00:00:00:00', srcIp, gatewayIp, false, packetNo),
          rawBytes: arpReqBytes,
        });
        packetNo++;
        curTime += 1.000210;
      }
    } else {
      // Normal routed sequence
      // 1. ARP for Default Gateway
      const arpGwReqBytes = buildArpPacket(srcMac, srcIp, '00:00:00:00:00:00', gatewayIp, false);
      packets.push({
        no: packetNo,
        timeSec: curTime,
        source: srcMac,
        destination: 'Broadcast',
        protocol: 'ARP',
        length: arpGwReqBytes.length,
        info: `Who has ${gatewayIp}? Tell ${srcIp}`,
        summaryTree: buildArpTree(arpGwReqBytes, srcMac, '00:00:00:00:00:00', srcIp, gatewayIp, false, packetNo),
        rawBytes: arpGwReqBytes,
      });
      packetNo++;
      curTime += 0.000912;

      // 2. ARP Reply from Gateway
      const arpGwReplyBytes = buildArpPacket(routerMac, gatewayIp, srcMac, srcIp, true);
      packets.push({
        no: packetNo,
        timeSec: curTime,
        source: routerMac,
        destination: srcMac,
        protocol: 'ARP',
        length: arpGwReplyBytes.length,
        info: `${gatewayIp} is at ${routerMac}`,
        summaryTree: buildArpTree(arpGwReplyBytes, routerMac, srcMac, gatewayIp, srcIp, true, packetNo),
        rawBytes: arpGwReplyBytes,
      });
      packetNo++;
      curTime += 0.000450;

      // 3. ICMP Echo Request to Gateway MAC
      const echoHop1Bytes = buildIcmpEchoPacket(srcMac, routerMac, srcIp, dstIp, false, 64);
      packets.push({
        no: packetNo,
        timeSec: curTime,
        source: srcIp,
        destination: dstIp,
        protocol: 'ICMP',
        length: echoHop1Bytes.length,
        info: `Echo (ping) request  id=0x0001, seq=1/256, ttl=64 (via GW ${gatewayIp})`,
        summaryTree: buildIcmpTree(echoHop1Bytes, srcMac, routerMac, srcIp, dstIp, false, 64, packetNo),
        rawBytes: echoHop1Bytes,
      });
      packetNo++;
      curTime += 0.001200;

      // 4. Forwarded Echo Request with decremented TTL
      const forwardedTtl = Math.max(1, 64 - 1);
      const echoHop2Bytes = buildIcmpEchoPacket(routerMac, dstMac, srcIp, dstIp, false, forwardedTtl);
      packets.push({
        no: packetNo,
        timeSec: curTime,
        source: srcIp,
        destination: dstIp,
        protocol: 'ICMP',
        length: echoHop2Bytes.length,
        info: `Echo (ping) request  id=0x0001, seq=1/256, ttl=${forwardedTtl} (forwarded by router)`,
        summaryTree: buildIcmpTree(echoHop2Bytes, routerMac, dstMac, srcIp, dstIp, false, forwardedTtl, packetNo),
        rawBytes: echoHop2Bytes,
      });
      packetNo++;
      curTime += Math.max(0.002, result.roundTripMs / 1000);

      // 5. Echo Reply if successful
      if (result.status === 'success') {
        const replyTtl = result.ttlRemaining || 63;
        const echoReplyBytes = buildIcmpEchoPacket(routerMac, srcMac, dstIp, srcIp, true, replyTtl);
        packets.push({
          no: packetNo,
          timeSec: curTime,
          source: dstIp,
          destination: srcIp,
          protocol: 'ICMP',
          length: echoReplyBytes.length,
          info: `Echo (ping) reply    id=0x0001, seq=1/256, ttl=${replyTtl}`,
          summaryTree: buildIcmpTree(echoReplyBytes, routerMac, srcMac, dstIp, srcIp, true, replyTtl, packetNo),
          rawBytes: echoReplyBytes,
        });
      }
    }
  }

  return packets;
}

export function createDefaultDissectedPackets(): DissectedPacket[] {
  const dummyResult: SimulationResult = {
    status: 'success',
    sourceHostId: 'host-1',
    destHostId: 'host-2',
    isSameSubnet: true,
    ttlRemaining: 64,
    steps: [],
    pathNodeIds: ['host-1', 'switch-1', 'host-2'],
    pathEdgeIds: ['e1', 'e2'],
    roundTripMs: 1.4,
  };

  const dummyNodes: SimNode[] = [
    {
      id: 'host-1',
      data: {
        label: 'Host-1',
        deviceType: 'host',
        ip: '192.168.1.10',
        cidr: 24,
        mac: '00:1A:2B:3C:4D:01',
        gateway: '192.168.1.1',
      },
    },
    {
      id: 'host-2',
      data: {
        label: 'Host-2',
        deviceType: 'host',
        ip: '192.168.1.20',
        cidr: 24,
        mac: '00:1A:2B:3C:4D:02',
        gateway: '192.168.1.1',
      },
    },
  ];

  return dissectSimulationResult(dummyResult, dummyNodes);
}
