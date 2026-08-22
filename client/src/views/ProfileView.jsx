import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Briefcase,
  GraduationCap,
  Sparkles,
  Globe,
  Plus,
  Save,
  Trash2,
  Edit3,
  ShieldCheck,
  Target,
  Layers,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

const GithubIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function ProfileView({ profile, onProfileUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('structured'); // 'structured' | 'star' | 'expand' | 'raw'
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Form State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  });

  const [preferences, setPreferences] = useState({
    targetRoles: '',
    targetLocations: '',
    minSalary: '',
    workAuthorization: '',
    dealBreakers: '',
  });

  const [skills, setSkills] = useState({
    languages: [],
    frameworks: [],
    databases: [],
    tools: [],
  });


  const [newSkillText, setNewSkillText] = useState('');
  const [selectedSkillCategory, setSelectedSkillCategory] = useState('frameworks');

  const [projects, setProjects] = useState([]);
  const [education, setEducation] = useState([]);
  const [starBank, setStarBank] = useState([]);

  // Modal / Star Form
  const [editingStar, setEditingStar] = useState(null);
  const [starForm, setStarForm] = useState({
    title: '',
    situation: '',
    task: '',
    action: '',
    result: '',
    tags: '',
  });

  // GitHub Expand
  const [githubUsername, setGithubUsername] = useState('');
  const [scanningGithub, setScanningGithub] = useState(false);
  const [githubResult, setGithubResult] = useState(null);

  // Initialize from props
  useEffect(() => {
    if (profile?.structured) {
      const s = profile.structured;
      if (s.personalInfo) setPersonalInfo(s.personalInfo);
      if (s.jobPreferences) setPreferences((prev) => ({ ...prev, ...s.jobPreferences }));
      if (s.skills && Object.keys(s.skills).length > 0) setSkills(s.skills);
      if (Array.isArray(s.projects)) setProjects(s.projects);
      if (Array.isArray(s.education)) setEducation(s.education);
      if (Array.isArray(s.starBank)) setStarBank(s.starBank);
      if (s.personalInfo?.github) {
        const handle = s.personalInfo.github.replace(/https?:\/\/github\.com\//i, '').replace(/\/.*$/, '');
        if (handle) setGithubUsername(handle);
      }
    }
  }, [profile]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ type: 'error', text: 'Please select a standard PDF resume file.' });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const res = await api.uploadResume(file);
      setMessage({ type: 'success', text: res.message || 'Resume parsed into Master Profile successfully!' });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const structuredPayload = {
        ...(profile?.structured || {}),
        personalInfo,
        jobPreferences: preferences,
        skills,
        projects,
        education,
        starBank,
      };

      await api.saveProfile(profile?.resume_text || '', structuredPayload);
      setMessage({ type: 'success', text: 'Master Profile saved successfully! Grounded for all AI tailoring.' });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkillText.trim()) return;
    const cat = selectedSkillCategory;
    const currentList = Array.isArray(skills[cat]) ? skills[cat] : [];
    if (!currentList.includes(newSkillText.trim())) {
      setSkills({
        ...skills,
        [cat]: [...currentList, newSkillText.trim()],
      });
    }
    setNewSkillText('');
  };

  const handleRemoveSkill = (category, skillToRemove) => {
    const currentList = Array.isArray(skills[category]) ? skills[category] : [];
    setSkills({
      ...skills,
      [category]: currentList.filter((s) => s !== skillToRemove),
    });
  };

  // STAR Bank Actions
  const handleSaveStarStory = async (e) => {
    e.preventDefault();
    if (!starForm.title.trim()) return;

    const storyToSave = {
      ...starForm,
      id: editingStar?.id || Date.now().toString(),
    };

    try {
      const res = await api.saveStarStory(storyToSave);
      setStarBank(res.starBank || []);
      setEditingStar(null);
      setStarForm({ title: '', situation: '', task: '', action: '', result: '', tags: '' });
      setMessage({ type: 'success', text: 'STAR story added to Master Response Bank.' });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      alert('Failed to save STAR story: ' + err.message);
    }
  };

  const handleDeleteStarStory = async (id) => {
    if (!confirm('Delete this STAR story?')) return;
    try {
      const res = await api.deleteStarStory(id);
      setStarBank(res.starBank || []);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      alert('Failed to delete STAR story: ' + err.message);
    }
  };

  // Live GitHub Scan
  const handleScanGithub = async () => {
    if (!githubUsername.trim()) return;
    setScanningGithub(true);
    setMessage(null);
    try {
      const res = await api.scanGithub(githubUsername.trim());
      setGithubResult(res);
      setMessage({
        type: 'success',
        text: `Scanned ${res.totalRepos} repositories for @${res.username}. Extracted ${res.competencies?.length || 0} competencies.`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'GitHub scan failed' });
    } finally {
      setScanningGithub(false);
    }
  };

  const handleMergeGithubCompetencies = () => {
    if (!githubResult?.competencies) return;
    const newLanguages = [...(skills.languages || [])];
    const newFrameworks = [...(skills.frameworks || [])];

    githubResult.competencies.forEach((c) => {
      if (c.category === 'Programming Language') {
        if (!newLanguages.includes(c.skill)) newLanguages.push(c.skill);
      } else {
        if (!newFrameworks.includes(c.skill)) newFrameworks.push(c.skill);
      }
    });

    setSkills({
      ...skills,
      languages: newLanguages,
      frameworks: newFrameworks,
    });

    setMessage({ type: 'success', text: 'GitHub competencies merged into Master Profile! Remember to click Save.' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Profile Studio</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/setup & /expand</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build your deep candidate dossier: verified career facts, STAR stories, target criteria, and scanned competencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
          >
            <Upload className={`h-4 w-4 ${uploading ? 'animate-bounce' : ''}`} />
            <span>{uploading ? 'Parsing PDF...' : 'Import PDF Resume'}</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
          >
            <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Master Profile'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`rounded-xl p-4 text-xs font-medium flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80">
        {[
          { id: 'structured', label: 'Structured Profile & Preferences' },
          { id: 'star', label: `STAR Response Bank (${starBank.length})` },
          { id: 'expand', label: 'GitHub Competency Scanner (/expand)' },
          { id: 'raw', label: 'PDF & Raw Text' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeSubTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: STRUCTURED PROFILE & PREFERENCES */}
      {activeSubTab === 'structured' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Personal & Target Preferences (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Personal Details */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Personal Contact Info
              </span>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={personalInfo.fullName || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={personalInfo.email || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Location</label>
                  <input
                    type="text"
                    value={personalInfo.location || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={personalInfo.linkedin || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={personalInfo.github || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Target Criteria & Deal-Breakers */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                <span>Career Criteria & Deal-Breakers</span>
              </span>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Target Roles</label>
                  <input
                    type="text"
                    value={preferences.targetRoles || ''}
                    onChange={(e) => setPreferences({ ...preferences, targetRoles: e.target.value })}
                    placeholder="e.g. Full Stack Engineer, Frontend Developer"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Target Locations / Work Mode</label>
                  <input
                    type="text"
                    value={preferences.targetLocations || ''}
                    onChange={(e) => setPreferences({ ...preferences, targetLocations: e.target.value })}
                    placeholder="e.g. Remote, Hybrid, Bengaluru"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Expected Compensation</label>
                  <input
                    type="text"
                    value={preferences.minSalary || ''}
                    onChange={(e) => setPreferences({ ...preferences, minSalary: e.target.value })}
                    placeholder="e.g. ₹12,00,000 / year or $110k"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-amber-300">Deal-Breakers (Auto-Veto)</label>
                  <textarea
                    rows={2}
                    value={preferences.dealBreakers || ''}
                    onChange={(e) => setPreferences({ ...preferences, dealBreakers: e.target.value })}
                    placeholder="e.g. No unpaid roles, No gambling, Onsite required"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white focus:border-indigo-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Skills, Projects, Education (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Skills Taxonomy Manager */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-indigo-400" />
                  <span>Technical Skills Taxonomy</span>
                </span>
              </div>

              {/* Add Skill Form */}
              <form onSubmit={handleAddSkill} className="flex items-center gap-2">
                <select
                  value={selectedSkillCategory}
                  onChange={(e) => setSelectedSkillCategory(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="languages">Languages</option>
                  <option value="frameworks">Frameworks & Libraries</option>
                  <option value="databases">Databases</option>
                  <option value="tools">Tools & DevOps</option>
                </select>

                <input
                  type="text"
                  value={newSkillText}
                  onChange={(e) => setNewSkillText(e.target.value)}
                  placeholder="Type technology (e.g. Next.js, Redis, Docker)..."
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />

                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Add Skill
                </button>
              </form>

              {/* Category Chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {Object.entries(skills).map(([cat, list]) => (
                  <div key={cat} className="space-y-1.5 p-3 rounded-lg border border-slate-800/80 bg-slate-900/40">
                    <span className="text-[11px] font-bold text-indigo-300 capitalize">{cat}</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Array.isArray(list) && list.length > 0 ? (
                        list.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-700"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(cat, item)}
                              className="text-slate-400 hover:text-red-400 transition"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No {cat} added yet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Projects */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-indigo-400" />
                  <span>Verified Projects & Contributions</span>
                </span>
              </div>

              {projects.length === 0 ? (
                <p className="text-xs text-slate-500">Upload a resume or add project achievements.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{proj.name}</h4>
                        {proj.technologies && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {proj.technologies}
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-xs text-slate-300 leading-relaxed">{proj.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: STAR STORY RESPONSE BANK */}
      {activeSubTab === 'star' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Master STAR Response Bank (/interview grounding)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every behavioral question in interview prep is grounded in these verified STAR stories.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingStar({});
                setStarForm({ title: '', situation: '', task: '', action: '', result: '', tags: '' });
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add STAR Story</span>
            </button>
          </div>

          {/* Form Modal / Accordion when editing */}
          {editingStar !== null && (
            <div className="glass-panel rounded-xl p-5 border border-indigo-500/40 space-y-4">
              <h4 className="text-xs font-bold text-indigo-300">
                {editingStar?.id ? 'Edit STAR Story' : 'New STAR Story'}
              </h4>

              <form onSubmit={handleSaveStarStory} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Story Title / Theme *</label>
                  <input
                    type="text"
                    required
                    value={starForm.title}
                    onChange={(e) => setStarForm({ ...starForm, title: e.target.value })}
                    placeholder="e.g. Scaling Database Query Performance Under Surge Traffic"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Situation (Context / Problem)</label>
                    <textarea
                      rows={3}
                      value={starForm.situation}
                      onChange={(e) => setStarForm({ ...starForm, situation: e.target.value })}
                      placeholder="What was the challenge or setting?"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Task (Your Exact Goal)</label>
                    <textarea
                      rows={3}
                      value={starForm.task}
                      onChange={(e) => setStarForm({ ...starForm, task: e.target.value })}
                      placeholder="What were you tasked with achieving?"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Action (What You Implemented)</label>
                    <textarea
                      rows={3}
                      value={starForm.action}
                      onChange={(e) => setStarForm({ ...starForm, action: e.target.value })}
                      placeholder="What technologies, patterns, or decisions did you execute?"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-emerald-400 block mb-1 font-semibold">Result (Quantifiable Outcome)</label>
                    <textarea
                      rows={3}
                      value={starForm.result}
                      onChange={(e) => setStarForm({ ...starForm, result: e.target.value })}
                      placeholder="What was the measurable impact (e.g. -45% latency, 99.9% uptime)?"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStar(null)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                  >
                    Save Story
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STAR Cards List */}
          {starBank.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
              No STAR stories recorded yet. Add your first story to calibrate mock interviews.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {starBank.map((story) => (
                <div
                  key={story.id}
                  className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">{story.title}</h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingStar(story);
                            setStarForm(story);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStarStory(story.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      {story.situation && (
                        <p><strong className="text-slate-400">Situation:</strong> {story.situation}</p>
                      )}
                      {story.action && (
                        <p><strong className="text-slate-400">Action:</strong> {story.action}</p>
                      )}
                      {story.result && (
                        <p><strong className="text-emerald-400">Result:</strong> {story.result}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: GITHUB COMPETENCY SCANNER (/expand) */}
      {activeSubTab === 'expand' && (
        <div className="glass-panel rounded-xl p-6 border border-slate-800 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GithubIcon className="h-5 w-5 text-indigo-400" />
              <span>Public Assets & Portfolio Scanner (/expand)</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Inspects your public GitHub repositories, topics, and framework usage to extract competencies with confidence ratings and source tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
            <div className="relative w-full">
              <GithubIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="Enter GitHub username (e.g. Bharath-S18)"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleScanGithub}
              disabled={scanningGithub || !githubUsername}
              className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 shrink-0"
            >
              {scanningGithub ? 'Scanning Repos...' : 'Scan Profile'}
            </button>
          </div>

          {githubResult && (
            <div className="space-y-6 pt-4 border-t border-slate-800">
              
              {/* Header + Merge button */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Extracted Competencies ({githubResult.competencies?.length || 0})
                </span>

                <button
                  onClick={handleMergeGithubCompetencies}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                >
                  Merge into Master Profile
                </button>
              </div>

              {/* Competencies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {githubResult.competencies?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{item.skill}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.source}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {item.score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Notable Repositories */}
              {githubResult.notableRepos?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Notable Public Repositories
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {githubResult.notableRepos.map((repo, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <span>{repo.name}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {repo.language}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-slate-300 line-clamp-2">{repo.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* VIEW 4: PDF PREVIEW & RAW TEXT */}
      {activeSubTab === 'raw' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Extracted Raw Resume Text
            </span>
            <pre className="h-96 overflow-y-auto rounded-lg border border-slate-800 bg-black/40 p-4 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {profile?.resume_text || 'No resume text parsed yet.'}
            </pre>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Embedded PDF Document
            </span>
            <div className="h-96 rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
              <iframe
                src="/api/profile/resume-file"
                className="w-full h-full border-0"
                title="Resume PDF"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
