import React, { useState, useEffect, useRef } from 'react';
import { Card, TablePagination } from '../components/common';
import { FaEdit, FaUserPlus, FaTrash, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import { usePagination } from '../hooks/usePagination';
import { supabase, apiCall } from '../supabaseClient';

import { IoPersonSharp } from "react-icons/io5";

function ManajemenPetugas() {
  const [petugasList, setPetugasList] = useState([]);
  const [tempatList, setTempatList] = useState([]);
  const [tugasList, setTugasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [currentAuthId, setCurrentAuthId] = useState(null);

  // RBAC State
  const [currentUserRole, setCurrentUserRole] = useState('');
  const roleRef = useRef('');

  // Pagination & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, getPaginatedData } = usePagination(5);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    email: '',
    alamat: '',
    nomor_telepon: '',
    role: 'Petugas',
    jenis_kelamin: true, // true = Laki-laki, false = Perempuan
    lokasi_tugas: '' // State dropdown lokasi
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
      // 1. Dapatkan role user yang sedang login untuk validasi hirarki
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('pengguna').select('role').eq('id', user.id).single();
        const myRole = String(userData?.role || '').toLowerCase();
        roleRef.current = myRole;
        setCurrentUserRole(myRole);
      }

      // 2. Tarik data awal
      fetchPetugas();
    };

    initDashboard();

    // Auto update setiap 5 menit (300.000 ms)
    const intervalId = setInterval(() => {
      fetchPetugas();
    }, 300000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchPetugas = async () => {
    setLoading(true);
    try {
      // Mengambil seluruh data pengguna via API route (bypass RLS di server-side)
      const result = await apiCall('/api/admin/pengguna');
      const data = result.data;

      const { data: tData } = await supabase.from('tempat').select('id_tempat, nama_gedung');
      if (tData) setTempatList(tData);

      const { data: ptData } = await supabase.from('pembagian_tugas').select('*');
      if (ptData) setTugasList(ptData);

      if (data) {
        const filteredData = data.filter(p => {
          const roleVal = String(p.role || 'petugas').toLowerCase();

          if (roleRef.current.includes('kepegawaian')) {
            return true;
          } else {
            return roleVal.includes('petugas');
          }
        });

        const sortedData = filteredData.sort((a, b) => {
          const nipA = String(a.nip || '');
          const nipB = String(b.nip || '');
          return nipA.localeCompare(nipB);
        });

        setPetugasList(sortedData);
      }
    } catch (err) {
      console.error('Crash in fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search & Pagination Logic
  const filteredPetugasList = petugasList.filter(p => 
    (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(p.nip || '').includes(searchTerm)
  );

  const currentPetugas = getPaginatedData(filteredPetugasList);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when search changes
  }, [searchTerm, setCurrentPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setCurrentAuthId(null);
    setFormData({
      nama: '',
      nip: '',
      email: '',
      alamat: '',
      nomor_telepon: '',
      role: 'Petugas',
      jenis_kelamin: true,
      lokasi_tugas: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (petugas) => {
    setIsEditing(true);
    setCurrentId(petugas.nip); // Gunakan NIP sebagai Primary Key baru
    setCurrentAuthId(petugas.auth_id); // Gunakan auth_id untuk update autentikasi
    const assigned = tugasList.find(t => String(t.nip_petugas) === String(petugas.nip));

    setFormData({
      nama: petugas.nama || '',
      nip: petugas.nip || '',
      email: petugas.email || '',
      alamat: petugas.alamat || '',
      nomor_telepon: petugas.nomor_telepon || '',
      role: petugas.role || 'Petugas',
      jenis_kelamin: petugas.jenis_kelamin === null ? true : petugas.jenis_kelamin,
      lokasi_tugas: assigned ? assigned.id_tempat : ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!formLoading) setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (isEditing) {
        // Mode UPDATE: Kirim ke API route untuk update auth email + data pengguna
        await apiCall('/api/admin/update-user', {
          method: 'POST',
          body: {
            auth_id: currentAuthId,
            nip: currentId,
            email: formData.email,
            nama: formData.nama,
            alamat: formData.alamat,
            nomor_telepon: formData.nomor_telepon,
            role: formData.role,
            jenis_kelamin: String(formData.jenis_kelamin) === 'true',
          },
        });

        // Sinkronisasi Plotting Lokasi (ini pakai supabase biasa, bukan admin)
        const assigned = tugasList.find(t => String(t.nip_petugas) === String(currentId));
        if (formData.lokasi_tugas) {
          if (assigned) {
             await supabase.from('pembagian_tugas').update({ id_tempat: formData.lokasi_tugas }).eq('id_tugas', assigned.id_tugas);
          } else {
             await supabase.from('pembagian_tugas').insert([{ nip_petugas: formData.nip, id_tempat: formData.lokasi_tugas }]);
          }
        } else if (assigned) {
           await supabase.from('pembagian_tugas').delete().eq('id_tugas', assigned.id_tugas);
        }

        await fetchPetugas();
        closeModal();
        setTimeout(() => alert('Data berhasil diperbarui!'), 100);
      } else {
        // Mode TAMBAH: Kirim ke API route untuk membuat Auth user baru
        const defaultPassword = 'Petugas' + formData.nip;

        await apiCall('/api/admin/create-user', {
          method: 'POST',
          body: {
            email: formData.email,
            password: defaultPassword,
            nama: formData.nama,
            role: formData.role,
            nip: formData.nip,
            alamat: formData.alamat,
            nomor_telepon: formData.nomor_telepon,
            jenis_kelamin: String(formData.jenis_kelamin) === 'true',
          },
        });

        // Tunggu sedikit agar trigger DB punya waktu membuat baris
        await new Promise(resolve => setTimeout(resolve, 800));

        // Insert Plotting Location
        if (formData.lokasi_tugas) {
            await supabase.from('pembagian_tugas').insert([{ nip_petugas: formData.nip, id_tempat: formData.lokasi_tugas }]);
        }

        await fetchPetugas();
        closeModal();
        setTimeout(() => alert(`Petugas berhasil ditambahkan!\nPassword Login Default: ${defaultPassword}`), 100);
      }

    } catch (err) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (auth_id, nip, nama) => {
    if (!window.confirm(`PERINGATAN: Yakin ingin menghapus semua data dan memblokir akses login petugas bernama "${nama}" secara permanen?`)) return;

    setLoading(true);
    try {
      // Hapus Auth User via API route
      if (auth_id) {
        await apiCall('/api/admin/delete-user', {
          method: 'POST',
          body: { auth_id },
        });
      }

      // Hapus di tabel Pengguna secara manual untuk jaga-jaga kalau Cascade off
      await supabase.from('pengguna').delete().eq('nip', nip);

      fetchPetugas();
    } catch (err) {
      alert('Gagal menghapus pengguna: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="position-relative">
      <div className="welcome-banner welcome-banner-blue flex-between-center">
        <div>
          <h2>Manajemen Petugas <IoPersonSharp /></h2>
          <p>Kelola data petugas, reset identitas, dan berikan akses sistem SIBERSIH.</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-add-pegawai"
        >
          <FaPlus /> Tambah Petugas
        </button>
      </div>

      <Card>
        <h3>Daftar Identitas Petugas</h3>
        <p className="card-description mb-20">Semua petugas yang memiliki akses sah ke dalam SIBERSIH terdaftar di bawah ini.</p>

        <div className="search-filter-container">
          <input 
            type="text" 
            placeholder="🔍 Cari Petugas (Nama atau NIP)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input search-input-long"
          />
        </div>

        {loading ? (
          <div className="loading-state-text">Memuat data petugas...</div>
        ) : (
          <div className="table-responsive">
            <table className="tabel-absensi tabel-wide">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Role</th>
                  <th>NIP</th>
                  <th>Email Login</th>
                  <th>Telepon</th>
                  <th>Kelamin</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentPetugas.length > 0 ? (
                  currentPetugas.map((p) => (
                    <tr key={p.nip}>
                      <td className="fw-semibold text-dark-blue">{p.nama || '-'}</td>
                      <td>
                        <span className={`badge ${p.role === 'Admin' ? 'badge-success' : p.role === 'Kepegawaian' ? 'badge-warning' : 'badge-default'}`}>
                          {p.role || 'Petugas'}
                        </span>
                      </td>
                      <td>{p.nip || '-'}</td>
                      <td>{p.email || '-'}</td>
                      <td>{p.nomor_telepon || '-'}</td>
                      <td>{p.jenis_kelamin === true ? 'L' : p.jenis_kelamin === false ? 'P' : '-'}</td>
                      <td className="text-center">
                        <button onClick={() => openEditModal(p)} className="btn-icon-edit" title="Edit"><FaEdit size={18} /></button>
                        <button onClick={() => handleDelete(p.auth_id, p.nip, p.nama)} className="btn-icon-delete" title="Hapus"><FaTrash size={18} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state-text">Belum ada data petugas ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredPetugasList.length > 0 && (
          <TablePagination 
            totalItems={filteredPetugasList.length} 
            itemsPerPage={itemsPerPage} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage} 
            onItemsPerPageChange={setItemsPerPage} 
          />
        )}
      </Card>

      {/* Modal / Popup Form */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">

            <div className="modal-header">
              <h3>{isEditing ? <><FaEdit /> Edit Data Petugas</> : <><FaUserPlus /> Tambah Petugas Baru</>}</h3>
              <button onClick={closeModal} className="modal-close-btn"><FaTimes size={20} /></button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} className="form-grid-2">

                <div className="form-group col-span-full">
                  <label className="form-label">Nama Lengkap</label>
                  <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} required placeholder="Masukkan nama" className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Login</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="email@contoh.com" className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">NIP</label>
                  <input type="number" name="nip" value={formData.nip} onChange={handleInputChange} required placeholder="Nomor Induk Pegawai" className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Nomor Telepon</label>
                  <input type="number" name="nomor_telepon" value={formData.nomor_telepon} onChange={handleInputChange} placeholder="08xxxxxxxx" className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Jabatan / Role</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} className="form-input">
                    <option value="Petugas">Petugas</option>
                  </select>
                </div>

                <div className="form-group col-span-full">
                  <label className="form-label">Jenis Kelamin</label>
                  <div className="radio-group-container">
                    <label className="radio-label">
                      <input type="radio" name="jenis_kelamin" value="true" checked={String(formData.jenis_kelamin) === 'true'} onChange={handleInputChange} />
                      Laki-laki
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="jenis_kelamin" value="false" checked={String(formData.jenis_kelamin) === 'false'} onChange={handleInputChange} />
                      Perempuan
                    </label>
                  </div>
                </div>

                <div className="form-group col-span-full">
                  <label className="form-label">Lokasi Plotting Penugasan (Opsional)</label>
                  <select name="lokasi_tugas" value={formData.lokasi_tugas} onChange={handleInputChange} className="form-input mb-5">
                    <option value="">-- Pilih dari Dropdown (Atau Ketik di Bawah) --</option>
                    {tempatList.map((t) => (
                      <option key={t.id_tempat} value={t.id_tempat}>{t.nama_gedung}</option>
                    ))}
                  </select>
                  <div className="position-relative">
                    <input 
                      type="text" 
                      list="lokasi-datalist" 
                      placeholder="Atau ketik nama gedung untuk mencari..." 
                      className="form-input"
                      value={tempatList.find(t => t.id_tempat === formData.lokasi_tugas)?.nama_gedung || ''}
                      onChange={(e) => {
                        const match = tempatList.find(t => t.nama_gedung === e.target.value);
                        if (match) {
                          setFormData(prev => ({...prev, lokasi_tugas: match.id_tempat}));
                        } else if (e.target.value === '') {
                          setFormData(prev => ({...prev, lokasi_tugas: ''}));
                        }
                      }}
                    />
                    <datalist id="lokasi-datalist">
                      {tempatList.map((t) => (
                        <option key={t.id_tempat} value={t.nama_gedung} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="form-group col-span-full">
                  <label className="form-label">Alamat Domisili</label>
                  <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} rows="3" placeholder="Tulis alamat lengkap" className="form-input form-textarea" />
                </div>

                <div className="modal-footer col-span-full">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Batal
                  </button>
                  <button type="submit" disabled={formLoading} className="btn btn-primary">
                    <FaSave /> {formLoading ? 'Menyimpan...' : 'Simpan Petugas'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default ManajemenPetugas;
