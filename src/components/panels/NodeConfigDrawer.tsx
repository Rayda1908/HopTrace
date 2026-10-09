import React, { useState } from 'react';
import {
  X,
  Trash2,
  Monitor,
  Network,
  Router as RouterIcon,
  AlertCircle,
  Plus,
  Unlink,
  ExternalLink,
} from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';
import {
  ipv4Schema,
  cidrSchema,
  macSchema,
  nodeNameSchema,
  portsSchema,
  cidrToSubnetMask,
  type AppNode,
  type HostNodeData,
  type SwitchNodeData,
  type RouterNodeData,
  type RouterInterface,
} from '../../types/network';

interface FieldErrorProps {
  message?: string | null;
}

const FieldError: React.FC<FieldErrorProps> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-sans">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
};

interface HostFormProps {
  node: AppNode;
}

const HostForm: React.FC<HostFormProps> = ({ node }) => {
  const updateNodeData = useNetworkStore((state) => state.updateNodeData);
  const data = node.data as HostNodeData;

  const [label, setLabel] = useState(data.label || '');
  const [ip, setIp] = useState(data.ip || '');
  const [cidr, setCidr] = useState(String(data.cidr ?? 24));
  const [gateway, setGateway] = useState(data.gateway || '');
  const [mac, setMac] = useState(data.mac || '');

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const handleLabelChange = (val: string) => {
    setLabel(val);
    const parsed = nodeNameSchema.safeParse(val);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        label: parsed.error.issues[0]?.message || 'Invalid device name',
      }));
    } else {
      setErrors((prev) => ({ ...prev, label: null }));
      updateNodeData(node.id, { label: val.trim() });
    }
  };

  const handleIpChange = (val: string) => {
    setIp(val);
    const parsed = ipv4Schema.safeParse(val.trim());
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        ip: parsed.error.issues[0]?.message || 'Invalid IPv4 address: must be 4 octets (0-255) with no leading zeroes',
      }));
    } else {
      setErrors((prev) => ({ ...prev, ip: null }));
      updateNodeData(node.id, { ip: val.trim() });
    }
  };

  const handleCidrChange = (val: string) => {
    setCidr(val);
    const clean = val.replace(/^\//, '').trim();
    const num = Number(clean);
    if (clean === '' || isNaN(num)) {
      setErrors((prev) => ({
        ...prev,
        cidr: 'CIDR must be an integer between 0 and 32',
      }));
      return;
    }
    const parsed = cidrSchema.safeParse(num);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        cidr: parsed.error.issues[0]?.message || 'CIDR cannot exceed 32',
      }));
    } else {
      setErrors((prev) => ({ ...prev, cidr: null }));
      updateNodeData(node.id, {
        cidr: num,
        subnetMask: cidrToSubnetMask(num),
      });
    }
  };

  const handleGatewayChange = (val: string) => {
    setGateway(val);
    if (val.trim() === '') {
      setErrors((prev) => ({ ...prev, gateway: null }));
      updateNodeData(node.id, { gateway: '' });
      return;
    }
    const parsed = ipv4Schema.safeParse(val.trim());
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        gateway: parsed.error.issues[0]?.message || 'Invalid gateway IPv4 address',
      }));
    } else {
      setErrors((prev) => ({ ...prev, gateway: null }));
      updateNodeData(node.id, { gateway: val.trim() });
    }
  };

  const handleMacChange = (val: string) => {
    setMac(val);
    const parsed = macSchema.safeParse(val.trim());
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        mac: parsed.error.issues[0]?.message || 'Invalid MAC address format (XX:XX:XX:XX:XX:XX)',
      }));
    } else {
      setErrors((prev) => ({ ...prev, mac: null }));
      updateNodeData(node.id, { mac: val.trim() });
    }
  };

  const currentCidrNum = Number(cidr.replace(/^\//, ''));
  const calculatedSubnetMask =
    !isNaN(currentCidrNum) && currentCidrNum >= 0 && currentCidrNum <= 32
      ? cidrToSubnetMask(currentCidrNum)
      : 'Invalid Mask';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          Device Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Host-1"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.label
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30'
          }`}
        />
        <FieldError message={errors.label} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          IPv4 Address
        </label>
        <input
          type="text"
          value={ip}
          onChange={(e) => handleIpChange(e.target.value)}
          placeholder="192.168.1.10"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.ip
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30'
          }`}
        />
        <FieldError message={errors.ip} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          Subnet Mask / CIDR
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm select-none">
            /
          </span>
          <input
            type="text"
            value={cidr.replace(/^\//, '')}
            onChange={(e) => handleCidrChange(e.target.value)}
            placeholder="24"
            className={`w-full pl-7 pr-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
              errors.cidr
                ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                : 'border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30'
            }`}
          />
        </div>
        <FieldError message={errors.cidr} />
        {!errors.cidr && (
          <div className="mt-1.5 px-2 py-1 rounded bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="text-zinc-500">Subnet Mask:</span>
            <span className="text-zinc-300">{calculatedSubnetMask}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          Default Gateway IP
        </label>
        <input
          type="text"
          value={gateway}
          onChange={(e) => handleGatewayChange(e.target.value)}
          placeholder="192.168.1.1 (optional)"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.gateway
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30'
          }`}
        />
        <FieldError message={errors.gateway} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          MAC Address
        </label>
        <input
          type="text"
          value={mac}
          onChange={(e) => handleMacChange(e.target.value)}
          placeholder="00:1A:2B:3C:4D:01"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.mac
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30'
          }`}
        />
        <FieldError message={errors.mac} />
      </div>
    </div>
  );
};

interface SwitchFormProps {
  node: AppNode;
}

const SwitchForm: React.FC<SwitchFormProps> = ({ node }) => {
  const updateNodeData = useNetworkStore((state) => state.updateNodeData);
  const nodes = useNetworkStore((state) => state.nodes);
  const edges = useNetworkStore((state) => state.edges);
  const removeEdge = useNetworkStore((state) => state.removeEdge);
  const setSelectedNodeId = useNetworkStore((state) => state.setSelectedNodeId);

  const data = node.data as SwitchNodeData;

  const [label, setLabel] = useState(data.label || '');
  const [mac, setMac] = useState(data.mac || '');
  const [ports, setPorts] = useState(String(data.ports ?? 8));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const handleLabelChange = (val: string) => {
    setLabel(val);
    const parsed = nodeNameSchema.safeParse(val);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        label: parsed.error.issues[0]?.message || 'Invalid device name',
      }));
    } else {
      setErrors((prev) => ({ ...prev, label: null }));
      updateNodeData(node.id, { label: val.trim() });
    }
  };

  const handleMacChange = (val: string) => {
    setMac(val);
    const parsed = macSchema.safeParse(val.trim());
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        mac: parsed.error.issues[0]?.message || 'Invalid MAC address format (XX:XX:XX:XX:XX:XX)',
      }));
    } else {
      setErrors((prev) => ({ ...prev, mac: null }));
      updateNodeData(node.id, { mac: val.trim() });
    }
  };

  const handlePortsChange = (val: string) => {
    setPorts(val);
    const num = Number(val);
    if (val.trim() === '' || isNaN(num)) {
      setErrors((prev) => ({
        ...prev,
        ports: 'Port count must be an integer',
      }));
      return;
    }
    const parsed = portsSchema.safeParse(num);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        ports: parsed.error.issues[0]?.message || 'Port count must be 1-64',
      }));
    } else {
      setErrors((prev) => ({ ...prev, ports: null }));
      updateNodeData(node.id, { ports: num });
    }
  };

  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const connectedItems = connectedEdges.map((edge, idx) => {
    const targetId = edge.source === node.id ? edge.target : edge.source;
    const targetNode = nodes.find((n) => n.id === targetId);
    return {
      edgeId: edge.id,
      portIndex: idx + 1,
      targetNode,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          Device Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Switch-1"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.label
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30'
          }`}
        />
        <FieldError message={errors.label} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          MAC Address
        </label>
        <input
          type="text"
          value={mac}
          onChange={(e) => handleMacChange(e.target.value)}
          placeholder="00:1A:2B:3C:5E:01"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.mac
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30'
          }`}
        />
        <FieldError message={errors.mac} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
            Port Count
          </label>
          <div className="flex gap-1">
            {[4, 8, 16, 24, 48].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePortsChange(String(preset))}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  Number(ports) === preset
                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold'
                    : 'bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <input
          type="number"
          min={1}
          max={64}
          value={ports}
          onChange={(e) => handlePortsChange(e.target.value)}
          placeholder="8"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.ports
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30'
          }`}
        />
        <FieldError message={errors.ports} />
      </div>

      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
            Connected Nodes ({connectedItems.length}/{ports || 8})
          </span>
        </div>

        {connectedItems.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-center text-xs text-zinc-500">
            No connected devices yet. Drag link handles on the canvas to connect devices to this switch.
          </div>
        ) : (
          <div className="space-y-2">
            {connectedItems.map(({ edgeId, portIndex, targetNode }) => {
              if (!targetNode) return null;
              const targetType = targetNode.data.deviceType;
              const targetLabel = targetNode.data.label;

              let targetDetails = '';
              if (targetType === 'host') {
                targetDetails = (targetNode.data as HostNodeData).ip || 'No IP';
              } else if (targetType === 'router') {
                const ifaces = (targetNode.data as RouterNodeData).interfaces || [];
                targetDetails = `${ifaces.length} Interfaces`;
              } else {
                targetDetails = 'Switch';
              }

              return (
                <div
                  key={edgeId}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] font-mono text-indigo-300 shrink-0">
                      P{portIndex}
                    </span>
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                      {targetType === 'host' && <Monitor className="w-3.5 h-3.5 text-emerald-400" />}
                      {targetType === 'switch' && <Network className="w-3.5 h-3.5 text-indigo-400" />}
                      {targetType === 'router' && <RouterIcon className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-200 truncate">{targetLabel}</div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">{targetDetails}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(targetNode.id)}
                      title="Inspect node"
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEdge(edgeId)}
                      title="Disconnect link"
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface RouterInterfaceRowProps {
  iface: RouterInterface;
  index: number;
  canDelete: boolean;
  onUpdate: (updated: RouterInterface) => void;
  onDelete: () => void;
}

const RouterInterfaceRow: React.FC<RouterInterfaceRowProps> = ({
  iface,
  index,
  canDelete,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState(iface.name);
  const [ip, setIp] = useState(iface.ip);
  const [cidr, setCidr] = useState(String(iface.cidr));
  const [mac, setMac] = useState(iface.mac);

  const [ipError, setIpError] = useState<string | null>(null);
  const [cidrError, setCidrError] = useState<string | null>(null);
  const [macError, setMacError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    const clean = val.trim();
    if (clean) {
      onUpdate({ ...iface, name: clean });
    }
  };

  const handleIpChange = (val: string) => {
    setIp(val);
    const parsed = ipv4Schema.safeParse(val.trim());
    if (!parsed.success) {
      setIpError(parsed.error.issues[0]?.message || 'Invalid IPv4 address');
    } else {
      setIpError(null);
      onUpdate({ ...iface, ip: val.trim() });
    }
  };

  const handleCidrChange = (val: string) => {
    setCidr(val);
    const clean = val.replace(/^\//, '').trim();
    const num = Number(clean);
    if (clean === '' || isNaN(num)) {
      setCidrError('CIDR must be 0-32');
      return;
    }
    const parsed = cidrSchema.safeParse(num);
    if (!parsed.success) {
      setCidrError(parsed.error.issues[0]?.message || 'CIDR 0-32');
    } else {
      setCidrError(null);
      onUpdate({ ...iface, cidr: num });
    }
  };

  const handleMacChange = (val: string) => {
    setMac(val);
    const parsed = macSchema.safeParse(val.trim());
    if (!parsed.success) {
      setMacError(parsed.error.issues[0]?.message || 'Invalid MAC');
    } else {
      setMacError(null);
      onUpdate({ ...iface, mac: val.trim() });
    }
  };

  return (
    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-20 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 font-mono text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-400"
          />
          <span className="text-[10px] text-zinc-500 font-mono">Port #{index + 1}</span>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete Interface"
            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
            IPv4 Address
          </label>
          <input
            type="text"
            value={ip}
            onChange={(e) => handleIpChange(e.target.value)}
            placeholder="192.168.1.1"
            className={`w-full px-2 py-1.5 rounded-lg bg-zinc-900 border font-mono text-xs text-zinc-100 focus:outline-none transition-colors ${
              ipError
                ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                : 'border-zinc-800 focus:border-amber-500/80'
            }`}
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
            CIDR Mask
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1.5 text-zinc-500 font-mono text-xs">/</span>
            <input
              type="text"
              value={cidr.replace(/^\//, '')}
              onChange={(e) => handleCidrChange(e.target.value)}
              placeholder="24"
              className={`w-full pl-5 pr-2 py-1.5 rounded-lg bg-zinc-900 border font-mono text-xs text-zinc-100 focus:outline-none transition-colors ${
                cidrError
                  ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-zinc-800 focus:border-amber-500/80'
              }`}
            />
          </div>
        </div>
      </div>

      {(ipError || cidrError) && (
        <div className="space-y-1">
          <FieldError message={ipError} />
          <FieldError message={cidrError} />
        </div>
      )}

      <div>
        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
          Interface MAC
        </label>
        <input
          type="text"
          value={mac}
          onChange={(e) => handleMacChange(e.target.value)}
          placeholder="00:1A:2B:3C:6F:01"
          className={`w-full px-2 py-1.5 rounded-lg bg-zinc-900 border font-mono text-xs text-zinc-100 focus:outline-none transition-colors ${
            macError
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-amber-500/80'
          }`}
        />
        <FieldError message={macError} />
      </div>
    </div>
  );
};

interface RouterFormProps {
  node: AppNode;
}

const RouterForm: React.FC<RouterFormProps> = ({ node }) => {
  const updateNodeData = useNetworkStore((state) => state.updateNodeData);
  const data = node.data as RouterNodeData;

  const [label, setLabel] = useState(data.label || '');
  const [mac, setMac] = useState(data.mac || '');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const interfaces = data.interfaces || [];

  const handleLabelChange = (val: string) => {
    setLabel(val);
    const parsed = nodeNameSchema.safeParse(val);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        label: parsed.error.issues[0]?.message || 'Invalid device name',
      }));
    } else {
      setErrors((prev) => ({ ...prev, label: null }));
      updateNodeData(node.id, { label: val.trim() });
    }
  };

  const handleMacChange = (val: string) => {
    setMac(val);
    const parsed = macSchema.safeParse(val.trim());
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        mac: parsed.error.issues[0]?.message || 'Invalid MAC format (XX:XX:XX:XX:XX:XX)',
      }));
    } else {
      setErrors((prev) => ({ ...prev, mac: null }));
      updateNodeData(node.id, { mac: val.trim() });
    }
  };

  const handleUpdateInterface = (index: number, updated: RouterInterface) => {
    const nextInterfaces = [...interfaces];
    nextInterfaces[index] = updated;
    updateNodeData(node.id, { interfaces: nextInterfaces });
  };

  const handleDeleteInterface = (index: number) => {
    if (interfaces.length <= 1) return;
    const nextInterfaces = interfaces.filter((_, idx) => idx !== index);
    updateNodeData(node.id, { interfaces: nextInterfaces });
  };

  const handleAddInterface = () => {
    const nextIndex = interfaces.length + 1;
    const hexSuffix = nextIndex.toString(16).padStart(2, '0').toUpperCase();
    const newIface: RouterInterface = {
      id: `iface-${Date.now()}-${nextIndex}`,
      name: `eth${interfaces.length}`,
      ip: `192.168.${nextIndex}.1`,
      cidr: 24,
      mac: `00:1A:2B:3C:6F:${hexSuffix}`,
    };
    const nextInterfaces = [...interfaces, newIface];
    updateNodeData(node.id, { interfaces: nextInterfaces });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          Device Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Router-1"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.label
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30'
          }`}
        />
        <FieldError message={errors.label} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
          System MAC Address
        </label>
        <input
          type="text"
          value={mac}
          onChange={(e) => handleMacChange(e.target.value)}
          placeholder="00:1A:2B:3C:6F:01"
          className={`w-full px-3 py-2 rounded-lg bg-zinc-950/80 border font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            errors.mac
              ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
              : 'border-zinc-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30'
          }`}
        />
        <FieldError message={errors.mac} />
      </div>

      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
            Network Interfaces ({interfaces.length})
          </span>
          <button
            type="button"
            onClick={handleAddInterface}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Interface</span>
          </button>
        </div>

        <div className="space-y-3">
          {interfaces.map((iface, idx) => (
            <RouterInterfaceRow
              key={iface.id || `${iface.name}-${idx}`}
              iface={iface}
              index={idx}
              canDelete={interfaces.length > 1}
              onUpdate={(updated) => handleUpdateInterface(idx, updated)}
              onDelete={() => handleDeleteInterface(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const NodeConfigDrawer: React.FC = () => {
  const selectedNodeId = useNetworkStore((state) => state.selectedNodeId);
  const nodes = useNetworkStore((state) => state.nodes);
  const setSelectedNodeId = useNetworkStore((state) => state.setSelectedNodeId);
  const removeNode = useNetworkStore((state) => state.removeNode);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  const isOpen = Boolean(selectedNode);

  const handleDeleteDevice = () => {
    if (!selectedNode) return;
    removeNode(selectedNode.id);
  };

  const renderBadge = () => {
    if (!selectedNode) return null;
    const type = selectedNode.data.deviceType;
    if (type === 'host') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 leading-tight">
              {selectedNode.data.label || 'Host'}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              PC Host Configuration
            </span>
          </div>
        </div>
      );
    }
    if (type === 'switch') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 leading-tight">
              {selectedNode.data.label || 'Switch'}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">
              Layer 2 Switch Configuration
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <RouterIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 leading-tight">
            {selectedNode.data.label || 'Router'}
          </h2>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
            Layer 3 Router Configuration
          </span>
        </div>
      </div>
    );
  };

  return (
    <aside
      role="dialog"
      aria-label="Node Configuration Drawer"
      aria-hidden={!isOpen}
      className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-40 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
    >
      {selectedNode && (
        <>
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950/40">
            {renderBadge()}
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              aria-label="Close configuration drawer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {selectedNode.data.deviceType === 'host' && (
              <HostForm key={selectedNode.id} node={selectedNode} />
            )}
            {selectedNode.data.deviceType === 'switch' && (
              <SwitchForm key={selectedNode.id} node={selectedNode} />
            )}
            {selectedNode.data.deviceType === 'router' && (
              <RouterForm key={selectedNode.id} node={selectedNode} />
            )}
          </div>

          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40">
            <button
              type="button"
              onClick={handleDeleteDevice}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 transition-colors shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Device</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
