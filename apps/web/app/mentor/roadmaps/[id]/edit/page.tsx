'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, formatApiError } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';

type Objective = { id: string; title: string; description?: string; type: string; xpReward: number; order: number };
type Milestone = { id: string; title: string; order: number; objectives: Objective[] };
type Module = { id: string; title: string; order: number; milestones: Milestone[] };
type Roadmap = { id: string; slug: string; title: string; description?: string; published: boolean; modules: Module[] };

const OBJ_TYPES = ['READ', 'PRACTICE', 'QUIZ', 'PROJECT', 'MOCK_INTERVIEW'];
const TYPE_LABEL: Record<string, string> = { READ: '📖 Read', PRACTICE: '💻 Practice', QUIZ: '🧠 Quiz', PROJECT: '🏗️ Project', MOCK_INTERVIEW: '🎤 Mock' };

const IMPORT_EXAMPLE = `{
  "modules": [
    {
      "title": "Arrays & Strings",
      "milestones": [
        {
          "title": "Basics",
          "objectives": [
            { "title": "Read array fundamentals", "type": "READ", "xpReward": 10 },
            { "title": "Solve 5 easy problems", "type": "PRACTICE", "xpReward": 25 }
          ]
        }
      ]
    }
  ]
}`;

function ImportJsonPanel({
  roadmapId,
  hasExistingModules,
  onImported,
}: {
  roadmapId: string;
  hasExistingModules: boolean;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState('');

  const importMut = useMutation({
    mutationFn: (body: { mode: 'append' | 'replace'; modules: unknown[] }) =>
      api(`/roadmaps/${roadmapId}/import`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setJsonText('');
      setReplace(false);
      setError('');
      setOpen(false);
      onImported();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        setError(formatApiError(e.body, 'Import failed'));
      } else {
        setError('Import failed');
      }
    },
  });

  const handleImport = () => {
    setError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError('Invalid JSON — check commas, quotes, and brackets.');
      return;
    }

    let modules: unknown;
    if (Array.isArray(parsed)) {
      modules = parsed;
    } else if (parsed && typeof parsed === 'object' && 'modules' in parsed) {
      modules = (parsed as { modules: unknown }).modules;
    } else {
      setError('JSON must be an object with a "modules" array, or a modules array at the root.');
      return;
    }

    if (!Array.isArray(modules) || modules.length === 0) {
      setError('At least one module is required.');
      return;
    }

    if (replace && hasExistingModules && !confirm('Replace all existing modules, milestones, and objectives? This cannot be undone.')) {
      return;
    }

    importMut.mutate({ mode: replace ? 'replace' : 'append', modules });
  };

  return (
    <div className="card mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-slate-800">Import from JSON</p>
          <p className="text-xs text-slate-500">Bulk-add modules, milestones, and objectives</p>
        </div>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 space-y-3">
          <textarea
            className="input font-mono text-xs min-h-[220px] resize-y"
            placeholder={IMPORT_EXAMPLE}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            disabled={importMut.isPending}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setJsonText(IMPORT_EXAMPLE)}
              disabled={importMut.isPending}
              className="btn-ghost btn-sm"
            >
              Load example
            </button>
            {hasExistingModules && (
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                  disabled={importMut.isPending}
                  className="rounded border-slate-300"
                />
                Replace existing content
              </label>
            )}
            <button
              type="button"
              onClick={handleImport}
              disabled={importMut.isPending || !jsonText.trim()}
              className="btn-primary btn-sm ml-auto"
            >
              {importMut.isPending ? 'Importing…' : 'Import JSON'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Objective types: READ, PRACTICE, QUIZ, PROJECT, MOCK_INTERVIEW. Orders are auto-assigned when omitted.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

function AddForm({ placeholder, onAdd, busy }: { placeholder: string; onAdd: (v: string) => void; busy: boolean }) {
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val.trim() && !busy) { onAdd(val.trim()); setVal(''); } }} className="flex gap-2 mt-2">
      <input className="input flex-1 text-sm" placeholder={placeholder} value={val} onChange={e => setVal(e.target.value)} required disabled={busy} />
      <button type="submit" disabled={busy || !val.trim()} className="btn-primary btn-sm">{busy ? 'Adding…' : 'Add'}</button>
    </form>
  );
}

function ObjectiveForm({ milestoneId, order, onDone }: { milestoneId: string; order: number; onDone: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('READ');
  const [xp, setXp] = useState(10);

  const mut = useMutation({
    mutationFn: () => api(`/roadmaps/milestones/${milestoneId}/objectives`, {
      method: 'POST',
      body: JSON.stringify({ title, description: desc || undefined, type, xpReward: xp, order }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmap-edit'] }); onDone(); },
  });

  return (
    <div className="border border-slate-200 rounded-lg p-4 mt-2 bg-slate-50 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 form-group">
          <label className="label text-xs">Objective title</label>
          <input className="input text-sm" placeholder="e.g. Read Chapter 3" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="label text-xs">Type</label>
          <select className="input text-sm" value={type} onChange={e => setType(e.target.value)}>
            {OBJ_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 form-group">
          <label className="label text-xs">Description (optional)</label>
          <input className="input text-sm" placeholder="Brief description" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label text-xs">XP Reward</label>
          <input className="input text-sm" type="number" min={1} max={1000} value={xp} onChange={e => setXp(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !title.trim()} className="btn-primary btn-sm">
          {mut.isPending ? 'Adding…' : 'Add objective'}
        </button>
        <button onClick={onDone} disabled={mut.isPending} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </div>
  );
}

function MilestoneBlock({ ms, modOrder, mutDeleteMs, mutDeleteObj, isDeleting }: {
  ms: Milestone; modOrder: number;
  mutDeleteMs: (id: string) => void;
  mutDeleteObj: (id: string) => void;
  isDeleting: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();

  const addMsMut = useMutation({
    mutationFn: (title: string) => api(`/roadmaps/modules/${ms.id}/milestones`, { method: 'POST', body: JSON.stringify({ title, order: ms.order }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-edit'] }),
  });

  return (
    <div className="pl-4 border-l-2 border-indigo-100 ml-2 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-indigo-600">{modOrder}.{ms.order}</span>
        <span className="text-sm font-medium text-slate-800">{ms.title}</span>
        <button
          type="button"
          onClick={() => { if (confirm(`Delete milestone "${ms.title}"?`)) mutDeleteMs(ms.id); }}
          disabled={isDeleting}
          className="ml-auto text-xs text-red-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1">
        {ms.objectives.map((obj) => (
          <div key={obj.id} className="flex items-center gap-2 pl-2 py-1.5 rounded-md hover:bg-slate-50 group">
            <span className="text-xs">{TYPE_LABEL[obj.type]?.split(' ')[0]}</span>
            <span className="text-sm text-slate-700 flex-1 truncate">{obj.title}</span>
            <span className="xp-badge text-xs">{obj.xpReward} XP</span>
            <button
              type="button"
              onClick={() => { if (confirm(`Delete objective "${obj.title}"?`)) mutDeleteObj(obj.id); }}
              disabled={isDeleting}
              className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {adding ? (
        <ObjectiveForm milestoneId={ms.id} order={ms.objectives.length + 1} onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} disabled={isDeleting} className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-40">+ Add objective</button>
      )}
    </div>
  );
}

function ModuleBlock({ mod, mutDeleteMod, mutDeleteMs, mutDeleteObj, isDeleting }: {
  mod: Module;
  mutDeleteMod: (id: string) => void;
  mutDeleteMs: (id: string) => void;
  mutDeleteObj: (id: string) => void;
  isDeleting: boolean;
}) {
  const qc = useQueryClient();
  const addMsMut = useMutation({
    mutationFn: (title: string) => api(`/roadmaps/modules/${mod.id}/milestones`, {
      method: 'POST', body: JSON.stringify({ title, order: mod.milestones.length + 1 }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-edit'] }),
  });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{mod.order}</span>
          <span className="font-semibold text-slate-800">{mod.title}</span>
          <span className="badge-slate">{mod.milestones.length} milestones</span>
        </div>
        <button
          type="button"
          onClick={() => { if (confirm(`Delete module "${mod.title}"? All milestones and objectives will be deleted.`)) mutDeleteMod(mod.id); }}
          disabled={isDeleting}
          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete module
        </button>
      </div>
      <div className="px-5 py-3">
        {mod.milestones.map((ms) => (
          <MilestoneBlock key={ms.id} ms={ms} modOrder={mod.order} mutDeleteMs={mutDeleteMs} mutDeleteObj={mutDeleteObj} isDeleting={isDeleting} />
        ))}
        <AddForm placeholder="New milestone title…" onAdd={(t) => addMsMut.mutate(t)} busy={addMsMut.isPending} />
      </div>
    </div>
  );
}

export default function EditRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ['roadmap-edit', id],
    queryFn: () => api<Roadmap>(`/roadmaps/${id}/edit`),
  });

  const addModMut = useMutation({
    mutationFn: (title: string) => api(`/roadmaps/${id}/modules`, {
      method: 'POST', body: JSON.stringify({ title, order: (roadmap?.modules?.length ?? 0) + 1 }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-edit', id] }),
  });

  const deleteModMut = useMutation({
    mutationFn: (modId: string) => api(`/roadmaps/modules/${modId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-edit', id] }),
  });

  const deleteMsMut = useMutation({
    mutationFn: (msId: string) => api(`/roadmaps/milestones/${msId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-edit', id] }),
  });

  const deleteObjMut = useMutation({
    mutationFn: (objId: string) => api(`/roadmaps/objectives/${objId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-edit', id] }),
  });

  const publishMut = useMutation({
    mutationFn: (published: boolean) => api(`/roadmaps/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap-edit', id] });
      qc.invalidateQueries({ queryKey: ['mentor-roadmaps'] });
    },
  });

  if (isLoading) {
    return <div className="max-w-3xl mx-auto space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-xl"/>)}</div>;
  }

  if (!roadmap) return <div className="empty-state"><p>Roadmap not found.</p></div>;

  const totalObjectives = roadmap.modules.flatMap(m => m.milestones.flatMap(ms => ms.objectives)).length;
  const isDeleting = deleteModMut.isPending || deleteMsMut.isPending || deleteObjMut.isPending;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">{roadmap.title}</h1>
            <span className={roadmap.published ? 'badge-green' : 'badge-slate'}>
              {roadmap.published ? '✓ Published' : 'Draft'}
            </span>
          </div>
          <p className="text-sm text-slate-500">{totalObjectives} objectives across {roadmap.modules.length} modules</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => publishMut.mutate(!roadmap.published)}
            disabled={publishMut.isPending}
            className={roadmap.published ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
          >
            {publishMut.isPending ? 'Saving…' : roadmap.published ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={() => router.push('/mentor/roadmaps')} disabled={publishMut.isPending} className="btn-ghost btn-sm">← Back</button>
        </div>
      </div>

      <ImportJsonPanel
        roadmapId={roadmap.id}
        hasExistingModules={roadmap.modules.length > 0}
        onImported={() => qc.invalidateQueries({ queryKey: ['roadmap-edit', id] })}
      />

      {/* Modules */}
      {roadmap.modules.length === 0 ? (
        <div className="card p-8 text-center mb-4">
          <div className="text-3xl mb-3">📦</div>
          <h3 className="font-semibold text-slate-900 mb-1">No modules yet</h3>
          <p className="text-sm text-slate-500">Add a module to start building your roadmap</p>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {roadmap.modules.map((mod) => (
            <ModuleBlock
              key={mod.id}
              mod={mod}
              mutDeleteMod={(modId) => deleteModMut.mutate(modId)}
              mutDeleteMs={(msId) => deleteMsMut.mutate(msId)}
              mutDeleteObj={(objId) => deleteObjMut.mutate(objId)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Add module */}
      <div className="card p-4">
        <p className="text-sm font-medium text-slate-700 mb-2">Add a new module</p>
        <AddForm placeholder="Module title (e.g. Introduction to DSA)…" onAdd={(t) => addModMut.mutate(t)} busy={addModMut.isPending} />
      </div>
    </div>
  );
}
