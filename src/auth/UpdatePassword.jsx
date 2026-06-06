import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaLock, FaCheckCircle } from "react-icons/fa";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import './UpdatePassword.css';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [success, setSuccess] = useState(false);

    // Tidak perlu pre-check sesi di sini.
    // Biarkan user langsung isi form — jika sesi tidak valid,
    // supabase.auth.updateUser() yang akan mengembalikan error.
    // Ini menghindari semua masalah race condition, iOS auto-fill popup, dsb.

    const handleUpdate = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (password !== confirmPassword) {
            setErrorMsg('Password dan Konfirmasi Password tidak cocok!');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('Password minimal harus 6 karakter.');
            return;
        }

        setLoading(true);

        try {
            // Mengupdate password user yang sedang memiliki sesi recovery
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                // Tangani error sesi secara spesifik agar pesan lebih ramah
                if (error.message.includes('session') || error.message.includes('token') || error.message.includes('Auth session') || error.status === 401 || error.status === 403) {
                    throw new Error('Sesi tidak valid atau telah kedaluwarsa. Silakan request link reset password baru dari halaman Login.');
                }
                throw error;
            }

            // Jika sukses, tampilkan pesan sukses
            setSuccess(true);

            // Logout sesi recovery agar aman
            await supabase.auth.signOut();

        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="update-pwd-container">
            <div className="update-pwd-card">
                <div className="update-pwd-header">
                    <div className="update-pwd-icon">
                        {success ? <FaCheckCircle color="#10b981" /> : <FaLock color="#667eea" />}
                    </div>
                    <h2>{success ? 'Password Diperbarui!' : 'Buat Password Baru'}</h2>
                    <p>
                        {success
                            ? 'Password Anda berhasil diubah. Silakan kembali ke halaman login.'
                            : 'Silakan masukkan password baru Anda untuk sistem SIBERSIH.'}
                    </p>
                </div>

                {errorMsg && (
                    <div className="update-pwd-error">
                        {errorMsg}
                    </div>
                )}

                {success ? (
                    <button
                        className="update-pwd-btn"
                        onClick={() => window.location.href = '/'}
                    >
                        Kembali ke Halaman Login
                    </button>
                ) : (
                    <form onSubmit={handleUpdate} className="update-pwd-form">

                        {/* Input Password Baru */}
                        <div className="input-group">
                            <label>Password Baru</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="eye-btn"
                                >
                                    {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Input Konfirmasi Password */}
                        <div className="input-group">
                            <label>Konfirmasi Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="eye-btn"
                                >
                                    {showConfirmPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`update-pwd-btn ${loading ? 'loading' : ''}`}
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UpdatePassword;