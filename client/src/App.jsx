import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import NewJobModal from './components/NewJobModal';
import DashboardView from './views/DashboardView';
import ProfileView from './views/ProfileView';
import HunterView from './views/HunterView';
import RankView from './views/RankView';
import TailorView from './views/TailorView';
import CrmView from './views/CrmView';
import InterviewView from './views/InterviewView';
import UpskillView from './views/UpskillView';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState({ connected: false });
  const [hunterStatus, setHunterStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, profileData, authData] = await Promise.all([
        api.getJobs().catch(() => []),
        api.getProfile().catch(() => null),
        api.getAuthStatus().catch(() => ({ connected: false })),
      ]);
      setJobs(jobsData || []);
      setProfile(profileData || null);
      setAuthStatus(authData || { connected: false });
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScanAlerts = async () => {
    setScanning(true);
    try {
      const res = await api.scanGmailAlerts();
      alert(`Gmail alert scan complete! Discovered ${res.scanned || 0} alert positions.`);
      loadData();
    } catch (err) {
      alert('Gmail scan error: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectJobForTailoring = (job) => {
    setSelectedJob(job);
    setActiveTab('tailor');
  };

  const stats = {
    total: jobs.length,
    tailored: jobs.filter((j) => j.status === 'tailored' || j.tailored_resume).length,
    interviewing: jobs.filter((j) => j.status === 'interviewing').length,
    applied: jobs.filter((j) => j.status === 'applied').length,
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        authStatus={authStatus}
        hunterStatus={hunterStatus}
        stats={stats}
        onRefresh={loadData}
        onOpenNewJobModal={() => setIsNewJobModalOpen(true)}
        loading={loading}
      />

      {/* Main Layout */}
      <div className="flex flex-1 w-full">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Center Content Workspace */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto min-h-[calc(100vh-4rem)]">
          {activeTab === 'dashboard' && (
            <DashboardView
              jobs={jobs}
              profile={profile}
              onSelectTab={setActiveTab}
              onSelectJobForTailoring={handleSelectJobForTailoring}
              onScanAlerts={handleScanAlerts}
              scanning={scanning}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView profile={profile} onProfileUpdated={loadData} />
          )}

          {activeTab === 'hunter' && (
            <HunterView
              jobs={jobs}
              onSelectJobForTailoring={handleSelectJobForTailoring}
              onRefresh={loadData}
              onOpenNewJobModal={() => setIsNewJobModalOpen(true)}
            />
          )}

          {activeTab === 'rank' && (
            <RankView jobs={jobs} onSelectJobForTailoring={handleSelectJobForTailoring} />
          )}

          {activeTab === 'tailor' && (
            <TailorView
              jobs={jobs}
              selectedJob={selectedJob}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'crm' && (
            <CrmView
              jobs={jobs}
              onRefresh={loadData}
              onSelectJobForTailoring={handleSelectJobForTailoring}
            />
          )}

          {activeTab === 'interview' && <InterviewView jobs={jobs} />}

          {activeTab === 'upskill' && <UpskillView jobs={jobs} />}
        </main>
      </div>

      {/* Modal for Manual Job Addition */}
      <NewJobModal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        onJobCreated={loadData}
      />
    </div>
  );
}
