import React, { useState, useEffect, useRef } from 'react';
import { Card, TablePagination } from '../components/common';
import { FaEdit, FaUserPlus, FaTrash, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import { usePagination } from '../hooks/usePagination';
import { supabase, supabaseAdmin } from '../supabaseClient';

import { IoPersonSharp } from "react-icons/io5";

function ManajemenPetugas() {
  const [petugasList, setPetugasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [currentAuthId, setCurrentAuthId] = useState(null);

  // RBAC State
  const [currentUserRole, setCurrentUserRole] = useState('');
  const roleRef = useRef('');
  const myAuthIdRef = useRef(null); // Simpan auth_id user yang sedang login

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
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
      // 1. Dapatkan role user yang sedang login untuk validasi hirarki
      // Ambil yang tercepat dari cache sesi (karena login sudah sangat ketat memvalidasi ini)
      let myRole = String(sessionStorage.getItem('currentUserRole') || '').toLowerCase();

      // Selalu ambil auth user untuk menyimpan auth_id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        myAuthIdRef.current = user.id;
        if (!myRole || myRole === 'null' || myRole === 'undefined') {
          const { data: userData } = await supabase.from('pengguna').select('role').eq('auth_id', user.id).single();
          myRole = String(userData?.role || user.user_metadata?.role || '').toLowerCase();
        }
      }

      roleRef.current = myRole;
      setCurrentUserRole(myRole);

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
      // Menggunakan supabaseAdmin untuk bypass RLS, agar bisa melihat semua data pengguna.
      if (!supabaseAdmin) throw new Error('Admin client tidak tersedia. Hubungi administrator.');
      const { data, error } = await supabaseAdmin
        .from('pengguna')
        .select('*');

      if (error) {
        console.error('Error fetching pengguna:', error);
      } else if (data) {
        const filteredData = data.filter(p => {
          // Sembunyikan data diri sendiri dari tabel (mencegah penghapusan akun sendiri)
          if (myAuthIdRef.current && p.auth_id === myAuthIdRef.current) return false;

          const roleVal = String(p.role || 'petugas').toLowerCase();

          if (roleRef.current.includes('kepegawaian')) {
            // Kepegawaian (Superuser Teratas): Lihat Admin, Petugas, dan Sesama Kepegawaian
            return true;
          } else {
            // Admin (Superuser Kedua): HANYA bisa lihat dan mengelola Petugas
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
    });
    setIsModalOpen(true);
  };

  const openEditModal = (petugas) => {
    setIsEditing(true);
    setCurrentId(petugas.nip); // Gunakan NIP sebagai Primary Key baru
    setCurrentAuthId(petugas.auth_id); // Simpan ID Auth asli
    setFormData({
      nama: petugas.nama || '',
      nip: petugas.nip || '',
      email: petugas.email || '',
      alamat: petugas.alamat || '',
      nomor_telepon: petugas.nomor_telepon || '',
      role: petugas.role || 'Petugas',
      jenis_kelamin: petugas.jenis_kelamin === null ? true : petugas.jenis_kelamin,
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
      if (!supabaseAdmin) throw new Error('Admin client tidak tersedia. Hubungi administrator.');

      if (isEditing) {
        // Sinkronisasi update kredensial / email di server Auth
        if (currentAuthId && formData.email) {
          const { error: errUpdateEmail } = await supabaseAdmin.auth.admin.updateUserById(currentAuthId, { email: formData.email });
          if (errUpdateEmail) throw errUpdateEmail;
        }

        // Mode UPDATE: Ubah data di tabel pengguna (Gunakan Admin untuk bypass RLS)
        const { error: updateError } = await supabaseAdmin
          .from('pengguna')
          .update({
            nama: formData.nama,
            nip: formData.nip, // Hati-hati mengubah PK (Pastikan ada ON UPDATE CASCADE di DB jika tabel terhubung)
            email: formData.email,
            alamat: formData.alamat,
            nomor_telepon: formData.nomor_telepon,
            role: formData.role,
            jenis_kelamin: String(formData.jenis_kelamin) === 'true',
          })
          .eq('nip', currentId);

        if (updateError) throw updateError;

        await fetchPetugas();
        closeModal();
        setTimeout(() => alert('Data berhasil diperbarui!'), 100);
      } else {
        // Mode TAMBAH: Bikin Auth User Dulu via Admin Client
        const defaultPassword = 'Petugas' + formData.nip;

        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            nama: formData.nama,
            role: formData.role,
            nip: formData.nip,
            alamat: formData.alamat,
            nomor_telepon: formData.nomor_telepon,
            jenis_kelamin: String(formData.jenis_kelamin) === 'true'
          }
        });

        if (authError) throw authError;

        // Tunggu sedikit agar trigger DB punya waktu membuat baris
        await new Promise(resolve => setTimeout(resolve, 800));

        // Note: Update tambahan dihilangkan karena asuransi terbaik adalah menangkapnya via Trigger DB.

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
    // Cegah penghapusan akun diri sendiri (safety net tambahan)
    if (auth_id && auth_id === myAuthIdRef.current) {
      alert('Anda tidak dapat menghapus akun Anda sendiri dari sistem!');
      return;
    }

    if (!window.confirm(`PERINGATAN: Yakin ingin menghapus semua data dan memblokir akses login petugas bernama "${nama}" secara permanen?`)) return;

    setLoading(true);
    try {
      // Hapus Auth User menggunakan Admin Client (Otomatis Cascade Hapus DB Pengguna jika constraint ada, atau hapus spesifik)
      if (auth_id) {
        const { error: errorDelAuth } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
        if (errorDelAuth) throw errorDelAuth;
      }

      // Hapus di tabel Pengguna secara manual jika Cascade tidak nyala
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
          <h2>Manajemen Kepegawaian <IoPersonSharp /></h2>
          <p>Kelola data seluruh lapisan Admin dan Petugas SIBERSIH.</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-add-pegawai"
        >
          <FaPlus /> Tambah Pegawai
        </button>
      </div>

      <Card>
        <h3>Daftar Identitas Pengguna Total</h3>
        <p className="card-description mb-20">Semua personil mulai dari Admin hingga Petugas terdaftar di bawah ini.</p>

        <div className="search-filter-container">
          <input
            type="text"
            placeholder="🔍 Cari Pengguna (Nama atau NIP)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input search-input-long"
          />
        </div>

        {loading ? (
          <div className="loading-state-text">Memuat data pengguna...</div>
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
                  <th>Gender</th>
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
              <h3>{isEditing ? <><FaEdit /> Edit Data Pengguna</> : <><FaUserPlus /> Tambah Pengguna Baru</>}</h3>
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
                    <option value="Admin">Admin</option>
                    <option value="Kepegawaian">Kepegawaian</option>
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
                  <label className="form-label">Alamat Domisili</label>
                  <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} rows="3" placeholder="Tulis alamat lengkap" className="form-input form-textarea" />
                </div>

                <div className="modal-footer col-span-full">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Batal
                  </button>
                  <button type="submit" disabled={formLoading} className="btn btn-primary">
                    <FaSave /> {formLoading ? 'Menyimpan...' : 'Simpan'}
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
