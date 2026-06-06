/**
 * Komponen Topbar
 * Menampilkan title halaman, profile, dan dropdown menu dengan fitur lengkap
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPageTitle } from '../../data/navigation';
import { supabase } from '../../supabaseClient';
import { IoMdSettings } from "react-icons/io";
import { IoPersonSharp } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaSun, FaMoon, FaCloudSun, FaSkyatlas } from "react-icons/fa";

const ProfileDropdown = ({ isOpen, profileRef, onToggleDropdown, profileData, basePath }) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  return (
    <div ref={profileRef} className="profile-dropdown">
      <div className="dropdown-header">
        <strong>{profileData?.nama || 'Memuat...'}</strong>
        <span style={{ textTransform: 'capitalize' }}>Role: {profileData?.role || '...'}</span>
      </div>
      <ul className="dropdown-list">
        <li onClick={() => {
          navigate(`${basePath}/profil`);
          if(onToggleDropdown) onToggleDropdown();
        }}>
          <IoPersonSharp /> Profil Saya
        </li>
        <li className="logout-btn" onClick={async () => {
          await supabase.auth.signOut();
        }}>Logout</li>
      </ul>
    </div>
  );
};

const Topbar = ({ 
  isDropdownOpen, 
  profileRef, 
  toggleBtnRef,
  onToggleDropdown,
  onToggleSidebar 
}) => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/kepegawaian') ? '/kepegawaian' : 
                   location.pathname.startsWith('/petugas') ? '/petugas' : '/admin';
  const title = getPageTitle(location.pathname, basePath);
  const [profileData, setProfileData] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (user && !userErr) {
        // Coba ambil dari tabel public.pengguna terlebih dahulu
        const { data, error } = await supabase
          .from('pengguna')
          .select('nama, role')
          .eq('auth_id', user.id)
          .single();
        
        if (data && !error) {
          setProfileData(data);
        } else {
          // Jika data di tabel belum sinkron, gunakan raw_user_meta_data sebagai fallback cerdas
          setProfileData({
             nama: user.user_metadata?.nama || user.email.split('@')[0],
             role: user.user_metadata?.role || 'pengguna'
          });
        }
      }
      setProfileLoaded(true);
    };
    
    fetchProfile();

    // Event listener pintar untuk memantau perubahan nama profil seketika
    window.addEventListener('profileUpdated', fetchProfile);
    return () => window.removeEventListener('profileUpdated', fetchProfile);
  }, []);

  // Greeting berdasarkan waktu
  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour < 11) return { text: 'Pagi', icon: <FaSun style={{ color: '#f59e0b', marginRight: '5px' }} /> };
    if (hour < 15) return { text: 'Siang', icon: <FaSun style={{ color: '#ef4444', marginRight: '5px' }} /> };
    if (hour < 18) return { text: 'Sore', icon: <FaCloudSun style={{ color: '#f97316', marginRight: '5px' }} /> };
    return { text: 'Malam', icon: <FaMoon style={{ color: '#1d4ed8', marginRight: '5px' }} /> };
  };

  // Format greeting sesuai role
  const renderGreetingText = () => {
    if (!profileLoaded) return null;
    const { text, icon } = getGreetingData();
    const role = profileData?.role || (basePath === '/kepegawaian' ? 'Kepegawaian' : basePath === '/petugas' ? 'Petugas' : 'Admin');
    
    if (role === 'Kepegawaian') return <>{icon} Selamat {text}!</>;
    if (role === 'Petugas') return <>{icon} Selamat {text}, Petugas!</>;
    return <>{icon} Selamat {text}, Admin!</>;
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Toggle Sidebar Button */}
        <button 
          ref={toggleBtnRef}
          className="sidebar-toggle-btn" 
          onClick={onToggleSidebar}
          title="Buka/Tutup Sidebar"
        >
          <GiHamburgerMenu />
        </button>

        <div className="topbar-title">
          <h1>{title}</h1>
          <p className="topbar-greeting">{renderGreetingText()}</p>
        </div>
      </div>

      <div className="profile-wrapper" ref={profileRef}>
        <div className="profile-section" onClick={onToggleDropdown}>
          <div className="profile-info">
            <span style={{ fontWeight: 'bold', display: 'block' }}>{profileLoaded ? (profileData?.nama || 'Pengguna') : ''}</span>
            <span style={{ fontSize: '12px', color: 'gray', textTransform: 'capitalize' }}>{profileLoaded ? (profileData?.role || '') : ''}</span>
          </div>
          <div className="profile-pic">{profileLoaded && profileData ? profileData.nama.charAt(0).toUpperCase() : ''}</div>
        </div>

        <ProfileDropdown 
          isOpen={isDropdownOpen} 
          profileRef={profileRef}
          onToggleDropdown={onToggleDropdown}
          profileData={profileData}
          basePath={basePath}
        />
      </div>
    </div>
  );
};

export default Topbar;
