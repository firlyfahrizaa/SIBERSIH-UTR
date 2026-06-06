/**
 * Komponen Sidebar
 * Menampilkan navigasi menu dengan logo dan styling yang profesional
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaRecycle } from "react-icons/fa";
import { menuItemsAdmin, menuItemsKepegawaian, menuItemsPetugas } from '../../data/navigation';

const Sidebar = ({ isCollapsed }) => {
  const location = useLocation();

  // Gunakan URL path sebagai sumber utama (instan, tanpa delay async)
  // Ini menghilangkan "bocoran" sidebar role lain saat loading
  let activeMenuMap = [];
  if (location.pathname.startsWith('/kepegawaian')) {
    activeMenuMap = menuItemsKepegawaian;
  } else if (location.pathname.startsWith('/petugas')) {
    activeMenuMap = menuItemsPetugas;
  } else if (location.pathname.startsWith('/admin')) {
    activeMenuMap = menuItemsAdmin;
  }

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* LOGO & BRAND */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          <span className="logo-icon"><FaRecycle /></span>
          <span className="logo-text">
            {location.pathname.startsWith('/petugas')
              ? 'SIBERSIH'
              : location.pathname.startsWith('/kepegawaian')
                ? 'SIBERSIH Kepegawaian'
                : 'SIBERSIH Admin'}
          </span>
        </h2>
        <p className="sidebar-version">v1.0 UTR</p>
      </div>

      {/* MENU ITEMS */}
      <ul className="sidebar-menu">
        {activeMenuMap.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/admin') || (location.pathname === '/' && item.path === '/kepegawaian');

          return (
            <Link
              key={item.id}
              to={item.path}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <li className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <span className="sidebar-icon">
                  <Icon />
                </span>
                <span className="sidebar-text">{item.label}</span>
              </li>
            </Link>
          );
        })}
      </ul>

      {/* SIDEBAR FOOTER */}
      <div className="sidebar-footer">
        <p className="sidebar-info">
          © 2026 SIBERSIH
        </p>
        <p className="sidebar-desc">
          Sistem Informasi Kebersihan
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
