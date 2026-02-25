import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RiskStatus = "Open" | "Mitigated" | "Accepted" | "Closed";

const impactLabels = ["", "Negligible", "Minor", "Moderate", "Major", "Critical"];
const probabilityLabels = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];

const scoreColor = (score: number) => {
    if (score >= 16) return "bg-red-100 text-red-800";
    if (score >= 9) return "bg-amber-100 text-amber-800";
    if (score >= 4) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
};

export default function ProjectRisks({ projectId }: { projectId: number }) {
    const { data: risks, refetch } = trpc.risks.list.useQuery({ projectId });
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: "",
        description: "",
        probability: 3,
        impact: 3,
        mitigationPlan: "",
        owner: "",
    });

    const createRisk = trpc.risks.create.useMutation({
        onSuccess: async () => {
            toast.success("Risk created");
            setForm({ title: "", description: "", probability: 3, impact: 3, mitigationPlan: "", owner: "" });
            setShowForm(false);
            await refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    const updateRisk = trpc.risks.update.useMutation({
        onSuccess: async () => {
            toast.success("Risk updated");
            await refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteRisk = trpc.risks.delete.useMutation({
        onSuccess: async () => {
            toast.success("Risk deleted");
            await refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    const handleCreate = () => {
        if (!form.title.trim()) {
            toast.error("Risk title is required");
            return;
        }
        createRisk.mutate({
            projectId,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            probability: form.probability,
            impact: form.impact,
            mitigationPlan: form.mitigationPlan.trim() || undefined,
            owner: form.owner.trim() || undefined,
        });
    };

    return (
        <Card className="bg-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        <CardTitle>Risk Register</CardTitle>
                    </div>
                    <Button size="sm" onClick={() => setShowForm(!showForm)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Risk
                    </Button>
                </div>
                <CardDescription>
                    Track and manage project risks with probability × impact scoring
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {showForm && (
                    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="risk-title">Title *</Label>
                                <Input
                                    id="risk-title"
                                    value={form.title}
                                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g., Vendor delivery delay"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="risk-owner">Owner</Label>
                                <Input
                                    id="risk-owner"
                                    value={form.owner}
                                    onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
                                    placeholder="Risk owner name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="risk-desc">Description</Label>
                            <Textarea
                                id="risk-desc"
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="Describe the risk..."
                                rows={2}
                            />
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Probability (1-5)</Label>
                                <Select
                                    value={String(form.probability)}
                                    onValueChange={(v) => setForm((p) => ({ ...p, probability: Number(v) }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                                {n} — {probabilityLabels[n]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Impact (1-5)</Label>
                                <Select
                                    value={String(form.impact)}
                                    onValueChange={(v) => setForm((p) => ({ ...p, impact: Number(v) }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                                {n} — {impactLabels[n]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <div className="rounded-lg border bg-white px-4 py-2 text-center">
                                    <p className="text-xs text-muted-foreground">Score</p>
                                    <p className={`text-lg font-bold ${scoreColor(form.probability * form.impact)} rounded px-2`}>
                                        {form.probability * form.impact}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="risk-mitigation">Mitigation Plan</Label>
                            <Textarea
                                id="risk-mitigation"
                                value={form.mitigationPlan}
                                onChange={(e) => setForm((p) => ({ ...p, mitigationPlan: e.target.value }))}
                                placeholder="Describe mitigation steps..."
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleCreate} disabled={createRisk.isPending}>
                                {createRisk.isPending ? "Creating..." : "Create Risk"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {!risks || risks.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <AlertTriangle className="mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-muted-foreground">No risks registered yet.</p>
                        <p className="text-xs text-muted-foreground">Click "Add Risk" to start tracking project risks.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {risks.map((risk) => (
                            <div
                                key={risk.id}
                                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50"
                            >
                                <div className={`mt-0.5 rounded px-2 py-1 text-xs font-bold ${scoreColor(risk.riskScore)}`}>
                                    {risk.riskScore}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{risk.title}</p>
                                        <Select
                                            value={risk.status}
                                            onValueChange={(v) =>
                                                updateRisk.mutate({ id: risk.id, status: v as RiskStatus })
                                            }
                                        >
                                            <SelectTrigger className="h-6 w-[110px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Open">Open</SelectItem>
                                                <SelectItem value="Mitigated">Mitigated</SelectItem>
                                                <SelectItem value="Accepted">Accepted</SelectItem>
                                                <SelectItem value="Closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {risk.description && (
                                        <p className="text-sm text-muted-foreground">{risk.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <span>P: {risk.probability} ({probabilityLabels[risk.probability]})</span>
                                        <span>I: {risk.impact} ({impactLabels[risk.impact]})</span>
                                        {risk.owner && <span>Owner: {risk.owner}</span>}
                                    </div>
                                    {risk.mitigationPlan && (
                                        <p className="text-xs text-slate-600">
                                            <span className="font-medium">Mitigation:</span> {risk.mitigationPlan}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => {
                                        if (confirm("Delete this risk?")) {
                                            deleteRisk.mutate({ id: risk.id });
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
