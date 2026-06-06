/**
 * Mock Data untuk aplikasi SIBERSIH Admin
 * File ini menyimpan semua data dummy yang digunakan di berbagai halaman
 */

export const mockAbsensiData = [
  { 
    id: 1, 
    nama: 'Budi Santoso', 
    shift: 'Pagi', 
    area: 'Lobby Utama', 
    status: 'Hadir' 
  },
  { 
    id: 2, 
    nama: 'Siti Aminah', 
    shift: 'Pagi', 
    area: 'Lantai 2 & Toilet', 
    status: 'Hadir' 
  },
  { 
    id: 3, 
    nama: 'Agus Pratama', 
    shift: 'Sore', 
    area: 'Parkiran', 
    status: 'Belum Hadir' 
  },
  { 
    id: 4, 
    nama: 'Dewi Lestari', 
    shift: 'Sore', 
    area: 'Kantin', 
    status: 'Belum Hadir' 
  },
];

export const mockPengaduanData = [
  { 
    id: 1, 
    tanggal: '03/04/2026', 
    area: 'Toilet Lantai 1', 
    masalah: 'Keran wastafel bocor airnya menggenang', 
    pelapor: 'Siti Aminah', 
    status: 'Menunggu Perbaikan' 
  },
  { 
    id: 2, 
    tanggal: '02/04/2026', 
    area: 'Gudang Belakang', 
    masalah: 'Lampu utama mati', 
    pelapor: 'Budi Santoso', 
    status: 'Selesai' 
  },
  { 
    id: 3, 
    tanggal: '02/04/2026', 
    area: 'Lobby Utama', 
    masalah: 'Keset pintu masuk sobek', 
    pelapor: 'Agus Pratama', 
    status: 'Selesai' 
  },
];

export const mockProfilData = {
  nama: 'Admin Gedung',
  role: 'Administrator Utama',
  email: 'admin@gedung.com',
  avatar: 'A', // Bisa diubah dengan URL gambar nantinya
};

export const mockDashboardStats = [
  { 
    label: 'Total Petugas', 
    value: 24, 
    className: 'default' 
  },
  { 
    label: 'Hadir Hari Ini', 
    value: 18, 
    className: 'green' 
  },
  { 
    label: 'Belum Hadir / Izin', 
    value: 6, 
    className: 'red' 
  },
  { 
    label: 'Area Menunggu Dibersihkan', 
    value: 3, 
    className: 'yellow' 
  },
];
