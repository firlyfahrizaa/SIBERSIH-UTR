/**
 * Custom hook untuk mengelola state sidebar dan dropdown
 * Memisahkan logic dari component untuk readability yang lebih baik
 */

import { useState, useEffect, useRef } from 'react';

// Helper function untuk detect mobile view reliably
const getMobileState = () => {
  if (typeof window === 'undefined') return false;
  // Use matchMedia for more reliable detection
  return window.matchMedia('(max-width: 768px)').matches;
};

export const useSidebarLayout = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getMobileState());
  const [isMobile, setIsMobile] = useState(getMobileState());
  
  const sidebarRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const profileRef = useRef(null);

  /**
   * Ensure mobile detection after hydration and on mount
   */
  useEffect(() => {
    const isMobileView = getMobileState();
    setIsMobile(isMobileView);
    setIsSidebarCollapsed(isMobileView);
  }, []);

  /**
   * Handle resize untuk detect mobile dan adjust sidebar
   */
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = getMobileState();
      setIsMobile(isMobileView);
      
      // Auto close sidebar ketika resize dari desktop ke mobile
      if (isMobileView) {
        setIsSidebarCollapsed(true);
      } else {
        // Open sidebar ketika resize dari mobile ke desktop
        setIsSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Handle click outside untuk tutup sidebar dan dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Tutup sidebar jika klik di luar di mobile
      if (getMobileState()) {
        if (
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          toggleBtnRef.current && 
          !toggleBtnRef.current.contains(event.target)
        ) {
          setIsSidebarCollapsed(true);
        }
      }

      // Tutup dropdown jika klik di luar
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const closeSidebar = () => setIsSidebarCollapsed(true);
  const openSidebar = () => setIsSidebarCollapsed(false);
  const closeDropdown = () => setIsDropdownOpen(false);

  return {
    isDropdownOpen,
    isSidebarCollapsed,
    isMobile,
    sidebarRef,
    toggleBtnRef,
    profileRef,
    toggleDropdown,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    closeDropdown,
  };
};
