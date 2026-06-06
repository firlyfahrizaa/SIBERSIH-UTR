import React, { useState, useEffect } from 'react';
import { Card, TablePagination } from '../components/common';
import { FaEdit, FaClipboardList, FaTrash, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import { usePagination } from '../hooks/usePagination';
import { supabase } from '../supabaseClient';

function Penugasan() {
  const [tugasList, setTugasList] = useState([]);
  const [tempatList, setTempatList] = useState([]);
  const [petugasList, setPetugasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, getPaginatedData } = usePagination(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [formData, setFormData] = useState({
    nip_petugas: '',
    id_tempat: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let mTugas = [], mTempat = [], mPetugas = [];

    // 1. Ambil List Tugas (Secara Independen agar tidak nge-block yang lain)
    const { data: dataTugas, error: errTugas } = await supabase
      .from('pembagian_tugas')
      .select('*'); // Dibuat tanpa order created_at jaga-jaga kalau kolom tidak ada
    if (errTugas) console.error("Tugas DB Error:", errTugas);
    else mTugas = dataTugas;

    // 2. Ambil List Master Tempat
    const { data: dataTempat, error: errTempat } = await supabase.from('tempat').select('*');
    if (errTempat) console.error("Tempat DB Error:", errTempat);
    else mTempat = dataTempat;

    // 3. Ambil List Pegawai (Fetch semua lalu filter manual untuk menghindari Error ENUM vs ILIKE di Postgres)
    const { data: dataPetugas, error: errPetugas } = await supabase
      .from('pengguna')
      .select('nip, nama, role');

    if (errPetugas) {
      console.error("Petugas DB Error:", errPetugas);
    } else {
      // Filter cerdas via JS saja
      mPetugas = (dataPetugas || []).filter(p => p.role && p.role.toLowerCase().includes('petugas'));
    }

    setTugasList(mTugas || []);
    setTempatList(mTempat || []);
    setPetugasList(mPetugas || []);
    setLoading(false);
  };

  const getPetugasName = (nip) => {
    if (!nip) return '-';
    const pet = petugasList.find(p => String(p.nip) === String(nip));
    return pet ? pet.nama : nip;
  };

  const getTempatName = (id) => {
    if (!id) return '-';
    const tmpt = tempatList.find(t => t.id_tempat === id);
    if (!tmpt) return id;
    return `${tmpt.nama_gedung}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      nip_petugas: '',
      id_tempat: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setIsEditing(true);
    setCurrentId(t.id_tugas);
    setFormData({
      nip_petugas: t.nip_petugas || '',
      id_tempat: t.id_tempat || ''
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
      const payload = {
        nip_petugas: formData.nip_petugas ? parseInt(formData.nip_petugas, 10) : null,
        id_tempat: formData.id_tempat || null
      };

      if (isEditing) {
        const { error } = await supabase
          .from('pembagian_tugas')
          .update(payload)
          .eq('id_tugas', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pembagian_tugas')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchData();
      closeModal();
    } catch (err) {
      alert('Gagal merekam penugasan: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Lepas / Hapus riwayat penugasan ini secara permanen?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('pembagian_tugas').delete().eq('id_tugas', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
      setLoading(false);
    }
  };

  const filteredTugasList = tugasList.filter(t =>
    (getPetugasName(t.nip_petugas) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.nip_petugas || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPageTugas = getPaginatedData(filteredTugasList);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, setCurrentPage]);

  return (
    <div style={{ position: 'relative' }}>
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Plotting & Penugasan <FaClipboardList /></h2>
          <p>Instruksikan lokasi yang harus dijangkau Petugas.</p>
        </div>
        <button
          onClick={openAddModal}
          style={{ position: 'relative', zIndex: 10, background: 'white', color: '#d97706', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          <FaPlus /> Beri Penugasan
        </button>
      </div>

      <Card>
        <h3>Daftar Penugasan Petugas</h3>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="🔍 Cari Petugas (Nama atau NIP)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', ...inputStyle }}
          />
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat Plotting...</div>
        ) : (
          <div className="table-responsive">
            <table className="tabel-absensi" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Petugas</th>
                  <th>Lokasi Bertugas</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentPageTugas.length > 0 ? (
                  currentPageTugas.map((t) => (
                    <tr key={t.id_tugas}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{getPetugasName(t.nip_petugas)}</td>
                      <td>
                        <span style={{ background: '#fef3c7', padding: '4px 10px', borderRadius: '15px', color: '#b45309', fontSize: '13px', fontWeight: 600 }}>
                          {getTempatName(t.id_tempat)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', minWidth: '100px' }}>
                        <button onClick={() => openEditModal(t)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '15px' }} title="Edit"><FaEdit size={18} /></button>
                        <button onClick={() => handleDelete(t.id_tugas)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Hapus"><FaTrash size={18} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Belum ada penugasan atau jadwal yang di-plot.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredTugasList.length > 0 && (
          <TablePagination
            totalItems={filteredTugasList.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </Card>

      {/* Modal / Popup Form */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>

            <div style={{ padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>{isEditing ? <><FaEdit /> Ubah Plotting</> : <><FaClipboardList /> Form Plotting Petugas</>}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', outline: 'none' }}><FaTimes size={20} /></button>
            </div>

            <div style={{ padding: '25px', overflowY: 'auto' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Petugas Eksekutor</label>
                  <select name="nip_petugas" value={formData.nip_petugas} onChange={handleInputChange} required style={{ ...inputStyle, marginBottom: '5px' }}>
                    <option value="">-- Pilih dari Dropdown (Atau Ketik di Bawah) --</option>
                    {petugasList.map((p) => (
                      <option key={p.nip} value={p.nip}>{p.nama} (NIP: {p.nip})</option>
                    ))}
                  </select>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      list="petugas-datalist"
                      placeholder="Atau ketik nama petugas untuk mencari..."
                      style={inputStyle}
                      value={petugasList.find(p => String(p.nip) === String(formData.nip_petugas))?.nama || ''}
                      onChange={(e) => {
                        const match = petugasList.find(p => p.nama === e.target.value);
                        if (match) {
                          setFormData(prev => ({ ...prev, nip_petugas: match.nip }));
                        } else if (e.target.value === '') {
                          setFormData(prev => ({ ...prev, nip_petugas: '' }));
                        }
                      }}
                    />
                    <datalist id="petugas-datalist">
                      {petugasList.map((p) => (
                        <option key={p.nip} value={p.nama} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Lokasi Bertugas</label>
                  <select name="id_tempat" value={formData.id_tempat} onChange={handleInputChange} required style={{ ...inputStyle, marginBottom: '5px' }}>
                    <option value="">-- Tentukan Gedung Tempat --</option>
                    {tempatList.map((t) => (
                      <option key={t.id_tempat} value={t.id_tempat}>{t.nama_gedung}</option>
                    ))}
                  </select>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      list="lokasi-datalist2"
                      placeholder="Atau ketik nama gedung untuk mencari..."
                      style={inputStyle}
                      value={tempatList.find(t => t.id_tempat === formData.id_tempat)?.nama_gedung || ''}
                      onChange={(e) => {
                        const match = tempatList.find(t => t.nama_gedung === e.target.value);
                        if (match) {
                          setFormData(prev => ({ ...prev, id_tempat: match.id_tempat }));
                        } else if (e.target.value === '') {
                          setFormData(prev => ({ ...prev, id_tempat: '' }));
                        }
                      }}
                    />
                    <datalist id="lokasi-datalist2">
                      {tempatList.map((t) => (
                        <option key={t.id_tempat} value={t.nama_gedung} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={closeModal} style={{ padding: '10px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                    Batal
                  </button>
                  <button type="submit" disabled={formLoading} style={{ padding: '10px 24px', border: 'none', background: '#d97706', borderRadius: '6px', color: 'white', cursor: formLoading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaSave /> {formLoading ? 'Memproses...' : 'Tugaskan Petugas'}
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

const inputStyle = {
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

export default Penugasan;
