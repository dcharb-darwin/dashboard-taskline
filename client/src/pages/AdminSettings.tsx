import { trpc } from "@/lib/trpc";
import { useBranding } from "@/lib/BrandingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, ImagePlus, Paintbrush, ShieldCheck, Settings, Tags, Trash2, Webhook, Plus, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const webhookEventOptions = [
    "project.created", "project.updated", "project.deleted",
    "task.created", "task.updated", "task.deleted",
    "template.created", "template.updated", "template.published", "template.archived",
    "integration.external_event",
] as const;

type GovernanceRole = "Admin" | "Editor" | "Viewer";
type AdminTab = "governance" | "notifications" | "branding" | "enums";

interface NotifPref {
    channels: { inApp: boolean; email: boolean; slack: boolean; webhook: boolean; webhookUrl: string };
    events: { overdue: boolean; dueSoon: boolean; assignmentChanged: boolean; statusChanged: boolean };
}

const defaultNotif: NotifPref = {
    channels: { inApp: true, email: false, slack: false, webhook: false, webhookUrl: "" },
    events: { overdue: true, dueSoon: true, assignmentChanged: true, statusChanged: true },
};

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState<AdminTab>("governance");

    // Governance data
    const { data: auditLogs, refetch: refetchAuditLogs } =
        trpc.governance.audit.list.useQuery({ limit: 20 });
    const { data: accessData, refetch: refetchPolicies } =
        trpc.governance.access.listPolicies.useQuery();
    const { data: webhooks, refetch: refetchWebhooks } =
        trpc.governance.webhooks.list.useQuery({ includeInactive: true });

    // Notification data
    const { data: notificationPreference, refetch: refetchNotifications } =
        trpc.collaboration.notificationPreferences.get.useQuery({ scopeType: "team", scopeKey: "default" });

    const [roleDrafts, setRoleDrafts] = useState<Record<string, GovernanceRole>>({});
    const [webhookForm, setWebhookForm] = useState({
        name: "", endpointUrl: "", eventsCsv: "project.updated,task.updated", secret: "",
    });
    const [notifDraft, setNotifDraft] = useState<NotifPref>(defaultNotif);

    useEffect(() => {
        if (!notificationPreference) return;
        setNotifDraft(notificationPreference as NotifPref);
    }, [notificationPreference]);

    // Mutations
    const setPolicyMutation = trpc.governance.access.setPolicy.useMutation({
        onSuccess: async () => { toast.success("Access policy updated"); await Promise.all([refetchPolicies(), refetchAuditLogs()]); },
        onError: (e) => toast.error(e.message),
    });
    const createWebhookMutation = trpc.governance.webhooks.create.useMutation({
        onSuccess: async () => {
            toast.success("Webhook created");
            setWebhookForm({ name: "", endpointUrl: "", eventsCsv: "project.updated,task.updated", secret: "" });
            await Promise.all([refetchWebhooks(), refetchAuditLogs()]);
        },
        onError: (e) => toast.error(e.message),
    });
    const removeWebhookMutation = trpc.governance.webhooks.remove.useMutation({
        onSuccess: async () => { toast.success("Webhook removed"); await Promise.all([refetchWebhooks(), refetchAuditLogs()]); },
        onError: (e) => toast.error(e.message),
    });
    const setNotifMutation = trpc.collaboration.notificationPreferences.set.useMutation({
        onSuccess: async () => { toast.success("Notification preferences saved"); await refetchNotifications(); },
        onError: (e) => toast.error(e.message),
    });

    const computedRoleByOpenId = useMemo(() => {
        const map: Record<string, GovernanceRole> = {};
        if (!accessData) return map;
        for (const u of accessData.users) map[u.openId] = u.role === "admin" ? "Admin" : "Editor";
        for (const p of accessData.policies) map[p.openId] = p.accessRole as GovernanceRole;
        return map;
    }, [accessData]);

    useEffect(() => {
        if (!accessData) return;
        setRoleDrafts((prev) => {
            const next = { ...prev };
            for (const u of accessData.users) {
                if (!next[u.openId]) next[u.openId] = computedRoleByOpenId[u.openId] ?? "Editor";
            }
            return next;
        });
    }, [accessData, computedRoleByOpenId]);

    const saveRole = (openId: string) => {
        const r = roleDrafts[openId];
        if (r) setPolicyMutation.mutate({ openId, accessRole: r });
    };

    const createWebhook = () => {
        const name = webhookForm.name.trim();
        const endpointUrl = webhookForm.endpointUrl.trim();
        const parsedEvents = webhookForm.eventsCsv.split(",").map((s) => s.trim()).filter(Boolean);
        if (!name || !endpointUrl || parsedEvents.length === 0) { toast.error("Provide name, endpoint URL, and events"); return; }
        const invalid = parsedEvents.filter((e) => !webhookEventOptions.includes(e as any));
        if (invalid.length) { toast.error(`Invalid events: ${invalid.join(", ")}`); return; }
        createWebhookMutation.mutate({ name, endpointUrl, events: parsedEvents as any, secret: webhookForm.secret.trim() || undefined, isActive: true });
    };

    const saveNotifPrefs = () => {
        setNotifMutation.mutate({
            scopeType: "team",
            scopeKey: "default",
            channels: notifDraft.channels,
            events: notifDraft.events,
        });
    };



    const tabs: { key: AdminTab; label: string; icon: typeof Settings }[] = [
        { key: "governance", label: "Governance & Access", icon: ShieldCheck },
        { key: "notifications", label: "Notifications", icon: Bell },
        { key: "enums", label: "Statuses & Labels", icon: Tags },
        { key: "branding", label: "Branding", icon: Paintbrush },
    ];

    return (
        <AppLayout showNewProjectButton={false}>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Admin Settings</h2>
                    <p className="mt-2 text-muted-foreground">System-wide configuration and governance controls</p>
                </div>

                {/* Tab bar */}
                <div className="flex gap-2 border-b pb-px">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${active ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ─── Governance tab ─────────────────────────────────── */}
                {activeTab === "governance" && (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {/* Access Policies */}
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle>Access Policies</CardTitle>
                                <CardDescription>Assign Admin, Editor, or Viewer roles</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!accessData?.users || accessData.users.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No users available yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {accessData.users.map((user) => (
                                            <div key={user.openId} className="grid grid-cols-[1fr_150px_auto] items-center gap-3 rounded border p-2">
                                                <div>
                                                    <p className="text-sm font-medium">{user.name || user.openId}</p>
                                                    <p className="text-xs text-muted-foreground">{user.openId}</p>
                                                </div>
                                                <Select
                                                    value={roleDrafts[user.openId] ?? computedRoleByOpenId[user.openId] ?? "Editor"}
                                                    onValueChange={(v) => setRoleDrafts((p) => ({ ...p, [user.openId]: v as GovernanceRole }))}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Admin">Admin</SelectItem>
                                                        <SelectItem value="Editor">Editor</SelectItem>
                                                        <SelectItem value="Viewer">Viewer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button size="sm" onClick={() => saveRole(user.openId)} disabled={setPolicyMutation.isPending}>Save</Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Audit Log */}
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle>Audit Log</CardTitle>
                                <CardDescription>Latest governance and lifecycle actions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!auditLogs || auditLogs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                                ) : (
                                    <div className="max-h-96 space-y-2 overflow-auto">
                                        {auditLogs.map((entry) => (
                                            <div key={entry.id} className="rounded border p-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-medium">{entry.action}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.entityType} #{entry.entityId} • {entry.actorName}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ─── Notifications tab ──────────────────────────────── */}
                {activeTab === "notifications" && (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {/* Notification Preferences */}
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle>
                                <CardDescription>System-wide delivery channels and event toggles</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="mb-3 text-sm font-semibold">Delivery Channels</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(["inApp", "email", "slack", "webhook"] as const).map((ch) => (
                                            <div key={ch} className="flex items-center justify-between rounded border p-3">
                                                <Label>{ch === "inApp" ? "In-app" : ch.charAt(0).toUpperCase() + ch.slice(1)}</Label>
                                                <Switch
                                                    checked={notifDraft.channels[ch] as boolean}
                                                    onCheckedChange={() =>
                                                        setNotifDraft((p) => ({
                                                            ...p,
                                                            channels: { ...p.channels, [ch]: !p.channels[ch] },
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {notifDraft.channels.webhook && (
                                    <div className="space-y-2">
                                        <Label>Webhook URL</Label>
                                        <Input
                                            placeholder="https://hooks.example.com/..."
                                            value={notifDraft.channels.webhookUrl || ""}
                                            onChange={(e) =>
                                                setNotifDraft((p) => ({ ...p, channels: { ...p.channels, webhookUrl: e.target.value } }))
                                            }
                                        />
                                    </div>
                                )}

                                <div>
                                    <h4 className="mb-3 text-sm font-semibold">Event Types</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {([
                                            ["overdue", "Overdue"],
                                            ["dueSoon", "Due Soon"],
                                            ["assignmentChanged", "Assignment Changes"],
                                            ["statusChanged", "Status Changes"],
                                        ] as const).map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between rounded border p-3">
                                                <Label>{label}</Label>
                                                <Switch
                                                    checked={notifDraft.events[key]}
                                                    onCheckedChange={() =>
                                                        setNotifDraft((p) => ({ ...p, events: { ...p.events, [key]: !p.events[key] } }))
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button onClick={saveNotifPrefs} disabled={setNotifMutation.isPending}>
                                    {setNotifMutation.isPending ? "Saving..." : "Save Preferences"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Webhook Subscriptions */}
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhook Subscriptions</CardTitle>
                                <CardDescription>Outbound lifecycle integrations</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={webhookForm.name} onChange={(e) => setWebhookForm((p) => ({ ...p, name: e.target.value }))} placeholder="Operations listener" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Endpoint URL</Label>
                                    <Input value={webhookForm.endpointUrl} onChange={(e) => setWebhookForm((p) => ({ ...p, endpointUrl: e.target.value }))} placeholder="https://example.com/hooks/rtc" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Events (comma separated)</Label>
                                    <Input value={webhookForm.eventsCsv} onChange={(e) => setWebhookForm((p) => ({ ...p, eventsCsv: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Secret (optional)</Label>
                                    <Input value={webhookForm.secret} onChange={(e) => setWebhookForm((p) => ({ ...p, secret: e.target.value }))} />
                                </div>
                                <Button onClick={createWebhook} disabled={createWebhookMutation.isPending}>
                                    {createWebhookMutation.isPending ? "Creating..." : "Create Webhook"}
                                </Button>

                                <div className="space-y-2">
                                    {(webhooks || []).map((wh) => (
                                        <div key={wh.id} className="rounded border p-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium">{wh.name}</p>
                                                <Button variant="destructive" size="sm" onClick={() => removeWebhookMutation.mutate({ id: wh.id })} disabled={removeWebhookMutation.isPending}>
                                                    Remove
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{wh.endpointUrl}</p>
                                            <p className="text-xs text-muted-foreground">Events: {(wh.events as string[]).join(", ")}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Status: {wh.isActive === "Yes" ? "Active" : "Inactive"} • Last: {wh.lastStatus || "Never"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ─── Branding tab ───────────────────────────────────── */}
                {activeTab === "branding" && <BrandingTab />}

                {/* ─── Enums tab ──────────────────────────────────────── */}
                {activeTab === "enums" && <EnumsTab />}
            </div>
        </AppLayout>
    );
}

// ── Branding tab component ──────────────────────────────────────────────────
function BrandingTab() {
    const { appName: currentName, logoUrl: currentLogo, refetch } = useBranding();
    const [appName, setAppName] = useState("");
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<string | null>(null); // base64
    const [removeExistingLogo, setRemoveExistingLogo] = useState(false);

    const updateMut = trpc.branding.update.useMutation({
        onSuccess: () => {
            toast.success("Branding updated");
            refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    // Sync form with current branding on mount
    useEffect(() => {
        setAppName(currentName);
    }, [currentName]);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be under 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setLogoPreview(base64);
            setLogoFile(base64);
            setRemoveExistingLogo(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleSave = () => {
        const patch: { appName?: string; logoUrl?: string | null } = {};
        if (appName.trim() && appName.trim() !== currentName) {
            patch.appName = appName.trim();
        }
        if (logoFile) {
            // Store as data URI directly (for in-memory mode)
            patch.logoUrl = logoFile;
        } else if (removeExistingLogo) {
            patch.logoUrl = null;
        }
        if (Object.keys(patch).length === 0) {
            toast.info("No changes to save");
            return;
        }
        updateMut.mutate(patch);
    };

    const displayedLogo = removeExistingLogo ? null : (logoPreview ?? currentLogo);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Application Branding</CardTitle>
                    <CardDescription>Customize the app name and logo that appear in the navigation bar and page title</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* App Name */}
                    <div className="space-y-2">
                        <Label htmlFor="branding-name">Application Name</Label>
                        <Input
                            id="branding-name"
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            placeholder="Darwin TaskLine"
                            maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground">Shown in the nav bar, browser tab, and exports</p>
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>Organization Logo</Label>
                        {displayedLogo ? (
                            <div className="flex items-center gap-4">
                                <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-slate-50 p-2">
                                    <img src={displayedLogo} alt="Logo" className="max-h-full max-w-full rounded object-contain" />
                                </div>
                                <div className="space-y-2">
                                    <label className="cursor-pointer">
                                        <Button size="sm" variant="outline" asChild>
                                            <span>Change Logo</span>
                                        </Button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleFileSelect(f);
                                            }}
                                        />
                                    </label>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => {
                                            setLogoPreview(null);
                                            setLogoFile(null);
                                            setRemoveExistingLogo(true);
                                        }}
                                    >
                                        <Trash2 className="mr-1 h-3 w-3" /> Remove
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                                onClick={() => document.getElementById("branding-logo-input")?.click()}
                            >
                                <ImagePlus className="mb-2 h-8 w-8 text-slate-400" />
                                <p className="text-sm font-medium text-slate-600">Click or drag to upload logo</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, SVG — Max 2MB</p>
                                <input
                                    id="branding-logo-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileSelect(f);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 border-t pt-4">
                        <Button onClick={handleSave} disabled={updateMut.isPending}>
                            {updateMut.isPending ? "Saving..." : "Save Branding"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAppName(currentName);
                                setLogoPreview(null);
                                setLogoFile(null);
                                setRemoveExistingLogo(false);
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Enums tab component ─────────────────────────────────────────────────────
import type { EnumOption, EnumGroupKey } from "@shared/enums";
import { ENUM_GROUP_LABELS, AVAILABLE_COLORS, COLOR_BADGE_CLASSES } from "@shared/enums";

function EnumsTab() {
    const utils = trpc.useUtils();
    const { data: enumData } = trpc.enums.list.useQuery();
    const updateMutation = trpc.enums.update.useMutation({
        onSuccess: async () => {
            toast.success("Enum options saved");
            await utils.enums.list.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div className="space-y-6">
            {enumData && (
                (Object.keys(ENUM_GROUP_LABELS) as EnumGroupKey[]).map((group) => (
                    <EnumGroupEditor
                        key={group}
                        group={group}
                        options={enumData[group]}
                        onSave={(options) => updateMutation.mutate({ group, options })}
                        isSaving={updateMutation.isPending}
                    />
                ))
            )}
        </div>
    );
}

function EnumGroupEditor({
    group,
    options: serverOptions,
    onSave,
    isSaving,
}: {
    group: EnumGroupKey;
    options: EnumOption[];
    onSave: (options: EnumOption[]) => void;
    isSaving: boolean;
}) {
    const [items, setItems] = useState<EnumOption[]>(serverOptions);

    useEffect(() => {
        setItems(serverOptions);
    }, [serverOptions]);

    const hasChanges = JSON.stringify(items) !== JSON.stringify(serverOptions);

    const addItem = () => {
        setItems((prev) => [...prev, { label: "", color: "gray" }]);
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof EnumOption, value: string) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const moveItem = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= items.length) return;
        setItems((prev) => {
            const next = [...prev];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });
    };

    const handleSave = () => {
        const valid = items.filter((i) => i.label.trim());
        if (valid.length === 0) {
            toast.error("At least one option is required");
            return;
        }
        const labels = valid.map((i) => i.label.trim());
        if (new Set(labels).size !== labels.length) {
            toast.error("Duplicate labels are not allowed");
            return;
        }
        onSave(valid.map((i) => ({ label: i.label.trim(), color: i.color })));
    };

    return (
        <Card className="bg-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">{ENUM_GROUP_LABELS[group]}</CardTitle>
                        <CardDescription>Manage the available options for {ENUM_GROUP_LABELS[group].toLowerCase()}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={addItem}>
                            <Plus className="mr-1 h-4 w-4" /> Add
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 rounded-lg border bg-slate-50 p-2"
                        >
                            <div className="flex flex-col">
                                <button
                                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    disabled={index === 0}
                                    onClick={() => moveItem(index, -1)}
                                >
                                    <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    disabled={index === items.length - 1}
                                    onClick={() => moveItem(index, 1)}
                                >
                                    <ArrowDown className="h-3 w-3" />
                                </button>
                            </div>
                            <Input
                                value={item.label}
                                onChange={(e) => updateItem(index, "label", e.target.value)}
                                placeholder="Label"
                                className="max-w-xs bg-white"
                            />
                            <Select
                                value={item.color}
                                onValueChange={(v) => updateItem(index, "color", v)}
                            >
                                <SelectTrigger className="w-32 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_COLORS.map((color) => (
                                        <SelectItem key={color} value={color}>
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className={`inline-block h-3 w-3 rounded-full ${COLOR_BADGE_CLASSES[color].split(" ")[0]}`}
                                                />
                                                {color}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${COLOR_BADGE_CLASSES[item.color] ?? COLOR_BADGE_CLASSES.gray}`}>
                                {item.label || "Preview"}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto text-red-600 hover:text-red-700"
                                onClick={() => removeItem(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
