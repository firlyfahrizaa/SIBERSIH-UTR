import React, { useState, useEffect } from 'react';
import { Card, TablePagination } from '../components/common';
import { FaEdit, FaBuilding, FaTrash, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import { usePagination } from '../hooks/usePagination';
import { supabase } from '../supabaseClient';

function ManajemenTempat() {
  const [tempatList, setTempatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, getPaginatedData } = usePagination(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [formData, setFormData] = useState({
    nama_gedung: '',
    daftar_area: [],
    deskripsi: ''
  });
  const [newAreaInput, setNewAreaInput] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil List Master Tempat
      const { data: dataTempat, error: errTempat } = await supabase
        .from('tempat')
        .select('*')
        .order('created_at', { ascending: false });

      if (errTempat) throw errTempat;

      setTempatList(dataTempat || []);
    } catch (error) {
      console.error('Data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddArea = () => {
    if (newAreaInput.trim() !== '') {
      setFormData(prev => ({ ...prev, daftar_area: [...prev.daftar_area, newAreaInput.trim()] }));
      setNewAreaInput('');
    }
  };

  const handleRemoveArea = (index) => {
    setFormData(prev => ({
      ...prev,
      daftar_area: prev.daftar_area.filter((_, i) => i !== index)
    }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      nama_gedung: '',
      daftar_area: [],
      deskripsi: ''
    });
    setNewAreaInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setIsEditing(true);
    setCurrentId(t.id_tempat);

    let parsedArea = [];
    try {
      parsedArea = JSON.parse(t.daftar_area);
      if (!Array.isArray(parsedArea)) parsedArea = [t.daftar_area];
    } catch (e) {
      if (t.daftar_area) parsedArea = [t.daftar_area];
    }

    setFormData({
      nama_gedung: t.nama_gedung || '',
      daftar_area: parsedArea,
      deskripsi: t.deskripsi || ''
    });
    setNewAreaInput('');
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
        nama_gedung: formData.nama_gedung,
        daftar_area: JSON.stringify(formData.daftar_area),
        deskripsi: formData.deskripsi
      };

      if (isEditing) {
        const { error } = await supabase
          .from('tempat')
          .update(payload)
          .eq('id_tempat', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tempat')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchData();
      closeModal();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Hapus seluruh gedung beserta area di dalamnya permanen?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('tempat').delete().eq('id_tempat', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
      setLoading(false);
    }
  };

  const filteredTempatList = tempatList.filter(t => {
    let areas = [];
    try { areas = JSON.parse(t.daftar_area); if (!Array.isArray(areas)) areas = [t.daftar_area]; }
    catch (e) { areas = [t.daftar_area]; }
    
    const term = searchTerm.toLowerCase();
    return (t.nama_gedung || '').toLowerCase().includes(term) || 
           areas.some(a => String(a || '').toLowerCase().includes(term));
  });

  const currentPageTempat = getPaginatedData(filteredTempatList);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, setCurrentPage]);

  return (
    <div style={{ position: 'relative' }}>
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Manajemen Tempat <FaBuilding /></h2>
          <p>Kelola zona kebersihan, gedung, dan pengalokasian petugas.</p>
        </div>
        <button
          onClick={openAddModal}
          style={{ position: 'relative', zIndex: 10, background: 'white', color: '#059669', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          <FaPlus /> Tambah Lokasi
        </button>
      </div>

      <Card>
        <h3>Daftar Gedung & Zona Kebersihan</h3>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="🔍 Cari Lokasi (Nama Gedung atau Area)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', ...inputStyle }}
          />
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat tempat...</div>
        ) : (
          <div className="table-responsive">
            <table className="tabel-absensi" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Nama Gedung</th>
                  <th>Area / Ruangan</th>
                  <th>Deskripsi Singkat</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentPageTempat.length > 0 ? (
                  currentPageTempat.map((t) => (
                    <tr key={t.id_tempat}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.nama_gedung}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(() => {
                            let areas = [];
                            try { areas = JSON.parse(t.daftar_area); if (!Array.isArray(areas)) areas = [t.daftar_area]; }
                            catch (e) { areas = [t.daftar_area]; }
                            return areas.filter(Boolean).map((a, i) => (
                              <span key={i} style={{ background: '#e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
                                {a}
                              </span>
                            ));
                          })()}
                        </div>
                      </td>
                      <td>{t.deskripsi || '-'}</td>
                      <td style={{ textAlign: 'center', minWidth: '100px' }}>
                        <button onClick={() => openEditModal(t)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '15px' }} title="Edit"><FaEdit size={18} /></button>
                        <button onClick={() => handleDelete(t.id_tempat, t.daftar_area)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Hapus"><FaTrash size={18} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Belum ada data tempat terdaftar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredTempatList.length > 0 && (
          <TablePagination 
            totalItems={filteredTempatList.length} 
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
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>{isEditing ? <><FaEdit /> Edit Lokasi</> : <><FaBuilding /> Tambah Lokasi Baru</>}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', outline: 'none' }}><FaTimes size={20} /></button>
            </div>

            <div style={{ padding: '25px', overflowY: 'auto' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Nama Gedung Utama</label>
                  <input type="text" name="nama_gedung" value={formData.nama_gedung} onChange={handleInputChange} required placeholder="Misal: Gedung Rektorat" style={inputStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Cakupan Area / Ruangan</label>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={newAreaInput}
                      onChange={(e) => setNewAreaInput(e.target.value)}
                      onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddArea(); } }}
                      placeholder="Ketik area, contoh: 'Toilet Lantai 2'"
                      style={inputStyle}
                    />
                    <button type="button" onClick={handleAddArea} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '6px', padding: '0 15px', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      + Tambah
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '30px', padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                    {formData.daftar_area.length > 0 ? formData.daftar_area.map((area, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '15px', fontSize: '13px', fontWeight: 600 }}>
                        {area}
                        <button type="button" onClick={() => handleRemoveArea(idx)} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><FaTimes size={12} /></button>
                      </div>
                    )) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Belum ada area, silakan input di atas...</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Deskripsi Tambahan</label>
                  <textarea name="deskripsi" value={formData.deskripsi} onChange={handleInputChange} rows="2" placeholder="Catatan spesifik tentang tempat ini..." style={{ ...inputStyle, resize: 'none' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={closeModal} style={{ padding: '10px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                    Batal
                  </button>
                  <button type="submit" disabled={formLoading} style={{ padding: '10px 24px', border: 'none', background: '#059669', borderRadius: '6px', color: 'white', cursor: formLoading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaSave /> {formLoading ? 'Menyimpan...' : 'Simpan Lokasi'}
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

export default ManajemenTempat;
