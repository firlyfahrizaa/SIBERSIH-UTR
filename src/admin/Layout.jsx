/**
 * Halaman Layout - Container utama dengan Sidebar dan Topbar
 * Menggunakan custom hooks dan separated components untuk readability
 * 
 * Features:
 * - Responsive sidebar (collapsible & toggleable)
 * - Profile dropdown
 * - Dynamic page title
 * - Mobile-friendly
 * - Click outside to close sidebar and dropdown
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/layout';
import { useSidebarLayout } from '../hooks/useSidebarLayout';

function Layout() {
  const {
    isDropdownOpen,
    isSidebarCollapsed,
    isMobile,
    sidebarRef,
    toggleBtnRef,
    profileRef,
    toggleDropdown,
    toggleSidebar,
    closeSidebar,
  } = useSidebarLayout();

  return (
    <>
      {/* SIDEBAR OVERLAY untuk mobile - untuk close sidebar */}
      {!isSidebarCollapsed && isMobile && (
        <div 
          className="sidebar-overlay" 
          onClick={closeSidebar}
        />
      )}

      {/* SIDEBAR - Mobile: Fixed Position Outside Container */}
      {isMobile && (
        <div 
          ref={sidebarRef} 
          className={`sidebar-wrapper sidebar-mobile ${isSidebarCollapsed ? 'collapsed' : 'open'}`}
        >
          <Sidebar isCollapsed={false} />
        </div>
      )}

      <div className="dashboard-container">
        {/* SIDEBAR - Desktop Only: Inside Container */}
        {!isMobile && (
          <div 
            ref={sidebarRef} 
            className={`sidebar-wrapper ${isSidebarCollapsed ? 'collapsed' : 'open'}`}
          >
            <Sidebar isCollapsed={isSidebarCollapsed} />
          </div>
        )}

        {/* AREA KANAN (TOPBAR + KONTEN) */}
        <div className="main-area">
          
          {/* TOPBAR */}
          <Topbar
            isDropdownOpen={isDropdownOpen}
            profileRef={profileRef}
            toggleBtnRef={toggleBtnRef}
            onToggleDropdown={toggleDropdown}
            onToggleSidebar={toggleSidebar}
          />

          {/* KONTEN HALAMAN */}
          <div className="content">
            <Outlet />
          </div>

        </div>
      </div>
    </>
  );
}

export default Layout;