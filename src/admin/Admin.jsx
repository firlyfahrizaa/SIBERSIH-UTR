import React, { useState } from 'react';
import Beranda from './Beranda';

function Admin() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('beranda');

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="dashboard-container">

      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>Dashboard Admin</h2>
        <ul>
          <li
            className={activeMenu === 'beranda' ? 'active' : ''}
            onClick={() => setActiveMenu('beranda')}
          >
            Beranda
          </li>
          <li
            className={activeMenu === 'absensi' ? 'active' : ''}
            onClick={() => setActiveMenu('absensi')}
          >
            Absensi Petugas
          </li>
          <li>Manajemen User</li>
          <li>Laporan</li>
        </ul>
      </div>

      {/* AREA KANAN */}
      <div className="main-area">

        {/* TOPBAR */}
        <div className="topbar">
          <h1>
            {activeMenu === 'beranda' ? 'Dashboard' : 'Dashboard'}
          </h1>

          <div className="profile-wrapper">
            <div className="profile-section" onClick={toggleDropdown}>
              <div className="profile-info">
                <span style={{ fontWeight: 'bold', display: 'block' }}>Admin Gedung</span>
                <span style={{ fontSize: '12px', color: 'gray' }}>Administrator</span>
              </div>
              <div className="profile-pic">A</div>
            </div>

            {isDropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <strong>Admin</strong>
                  <span>Role: Administrator Utama</span>
                </div>
                <ul className="dropdown-list">
                  <li>Profil</li>
                  <li>Pengaturan</li>
                  <li className="logout-btn">Logout</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* KONTEN UTAMA (Panggil Komponen di sini) */}
        <div className="content">
          {activeMenu === 'beranda' && <Beranda />}
        </div>

      </div>
    </div>
  );
}

export default Admin;