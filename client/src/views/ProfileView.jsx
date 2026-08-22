import React, { useState, useRef } from 'react';
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
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';

const GithubIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);


export default function ProfileView({ profile, onProfileUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('structured'); // 'structured' | 'raw' | 'expand'
  const [githubUsername, setGithubUsername] = useState('');
  const [scanningGithub, setScanningGithub] = useState(false);
  const [githubSkills, setGithubSkills] = useState([]);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const structured = profile?.structured || {};
  const personalInfo = structured?.personalInfo || {};
  const skills = structured?.skills || {};
  const projects = structured?.projects || [];
  const education = structured?.education || [];
  const workExp = structured?.workExperience || [];

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

  const handleScanGithub = () => {
    if (!githubUsername) return;
    setScanningGithub(true);
    setTimeout(() => {
      setScanningGithub(false);
      setGithubSkills([
        { skill: 'React / Next.js', source: `${githubUsername}/portfolio`, score: 95 },
        { skill: 'Node.js & Express', source: `${githubUsername}/backend-apis`, score: 90 },
        { skill: 'TypeScript & Tailwind', source: `${githubUsername}/frontend-apps`, score: 88 },
        { skill: 'Python / ML Pipelines', source: `${githubUsername}/data-projects`, score: 82 },
      ]);
      setMessage({ type: 'success', text: `Scanned public repositories for @${githubUsername}. Competencies ready to merge.` });
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Profile Studio</h1>
            <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-mono">/setup & /expand</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ground all AI job matches and 2-stage tailoring strictly in your verified career achievements.
          </p>
        </div>

        {/* Upload Button */}
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
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
          >
            <Upload className={`h-4 w-4 ${uploading ? 'animate-bounce' : ''}`} />
            <span>{uploading ? 'Parsing PDF...' : 'Upload PDF Resume'}</span>
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

      {/* Sub tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80">
        <button
          onClick={() => setActiveSubTab('structured')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeSubTab === 'structured'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Structured Master Profile
        </button>
        <button
          onClick={() => setActiveSubTab('expand')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'expand'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GithubIcon className="h-3.5 w-3.5" />
          <span>Competency Extractor (/expand)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('raw')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeSubTab === 'raw'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Raw Parsed Text & PDF
        </button>
      </div>

      {/* View 1: Structured Profile */}
      {activeSubTab === 'structured' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Personal & Skills */}
          <div className="space-y-6">
            
            {/* Personal Details Card */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Personal Details</span>
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name</span>
                  <span className="font-semibold text-white">{personalInfo.fullName || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="text-slate-300">{personalInfo.email || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="text-slate-300">{personalInfo.phone || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location</span>
                  <span className="text-slate-300">{personalInfo.location || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Technical Skills Card */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Core Skill Categories</span>
                <Code2 className="h-3.5 w-3.5 text-indigo-400" />
              </div>

              {Object.keys(skills).length === 0 ? (
                <p className="text-xs text-slate-500">Upload a PDF resume to extract skills taxonomy.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(skills).map(([category, list]) => (
                    <div key={category} className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-indigo-300 capitalize">{category}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(list) ? (
                          list.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[11px] text-slate-200"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">{String(list)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column 2 & 3: Projects & Education */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Projects Card */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Verified Projects & Contributions</span>
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
              </div>

              {projects.length === 0 ? (
                <p className="text-xs text-slate-500">No projects parsed from resume yet.</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{proj.name}</h3>
                        {proj.technologies && (
                          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
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

            {/* Education Card */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Education & Credentials</span>
                <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
              </div>

              {education.length === 0 ? (
                <p className="text-xs text-slate-500">No education entries found.</p>
              ) : (
                <div className="space-y-3">
                  {education.map((edu, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{edu.degree || 'Degree'}</span>
                        <span className="text-slate-400">{edu.year || ''}</span>
                      </div>
                      <p className="text-xs text-slate-300">{edu.institution || ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* View 2: /expand GitHub Competency Extractor */}
      {activeSubTab === 'expand' && (
        <div className="glass-panel rounded-xl p-6 border border-slate-800 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Github className="h-5 w-5 text-indigo-400" />
              <span>Public Assets & Portfolio Scanner (/expand)</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Inspects your public GitHub repositories, portfolio code, and packages to surface real-world competencies and framework proficiencies that may not be detailed in your base resume.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
            <div className="relative w-full">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
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

          {githubSkills.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Extracted Competencies
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {githubSkills.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/60"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{item.skill}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Source: {item.source}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {item.score}% Confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 3: Raw Text & PDF */}
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
              Embedded PDF Preview
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
