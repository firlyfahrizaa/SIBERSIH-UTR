/**
 * Konfigurasi navigasi sidebar
 * Sentralisasi semua menu items untuk mudah di-maintain
 */

import { RiHomeLine } from "react-icons/ri";
import { BiTask } from "react-icons/bi";
import { IoPeopleSharp } from "react-icons/io5";
import { TbReportAnalytics } from "react-icons/tb";
import { FaHome, FaUsers, FaBuilding, FaFileAlt, FaClipboardList, FaExclamationTriangle } from "react-icons/fa";

// MENU UNTUK ADMIN
export const menuItemsAdmin = [
  { id: 'beranda', label: 'Beranda Admin', path: '/admin', icon: RiHomeLine },
  { id: 'absensi', label: 'Absensi Petugas', path: '/admin/absensi', icon: BiTask },
  { id: 'manajemen-petugas', label: 'Manajemen Petugas', path: '/admin/manajemen-petugas', icon: IoPeopleSharp },
  { id: 'aduan-petugas', label: 'Aduan Petugas', path: '/admin/pengaduan', icon: FaExclamationTriangle },
  { id: 'laporan', label: 'Laporan', path: '/admin/laporan', icon: TbReportAnalytics },
];

// MENU UNTUK KEPEGAWAIAN (SUPERUSER)
export const menuItemsKepegawaian = [
  { id: 'beranda', label: 'Beranda', path: '/kepegawaian', icon: RiHomeLine },
  { id: 'manajemen-kepegawaian', label: 'Manajemen Kepegawaian', path: '/kepegawaian/manajemen', icon: FaUsers },
  { id: 'manajemen-tempat', label: 'Manajemen Tempat', path: '/kepegawaian/manajemen-tempat', icon: FaBuilding },
  { id: 'penugasan', label: 'Plotting Penugasan', path: '/kepegawaian/penugasan', icon: FaClipboardList },
  { id: 'aduan-masuk', label: 'Tindak Lanjut Aduan', path: '/kepegawaian/aduan-masuk', icon: FaExclamationTriangle },
  { id: 'laporan', label: 'Laporan SIBERSIH', path: '/kepegawaian/laporan', icon: TbReportAnalytics },
];

// MENU UNTUK PETUGAS (MASA DEPAN)
// MENU UNTUK PETUGAS
export const menuItemsPetugas = [
  { id: 'beranda', label: 'Beranda', path: '/petugas', icon: RiHomeLine },
  { id: 'absensi', label: 'Absensi & History', path: '/petugas/absensi', icon: BiTask },
  { id: 'pengaduan', label: 'Kirim Pengaduan', path: '/petugas/pengaduan', icon: FaExclamationTriangle },
];

// UTILITY GET TITLE (scoped per role agar tidak bocor title role lain)
export const getPageTitle = (pathname, basePath) => {
  let roleItems;
  if (basePath === '/kepegawaian') roleItems = menuItemsKepegawaian;
  else if (basePath === '/petugas') roleItems = menuItemsPetugas;
  else roleItems = menuItemsAdmin;
  
  const item = roleItems.find(item => item.path === pathname || pathname.startsWith(item.path + '/profil'));
  if (item) return item.label;
  
  // Fallback: cek path profil generik
  if (pathname.endsWith('/profil')) return 'Profil Saya';
  return 'Sistem SIBERSIH';
};
