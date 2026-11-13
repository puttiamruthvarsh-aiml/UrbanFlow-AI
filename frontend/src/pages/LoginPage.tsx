
import React, { useState } from 'react';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    Car,
    Eye,
    EyeOff,
    LockKeyhole,
    Siren,
    ShieldCheck
} from 'lucide-react';
import { ActiveRole } from '../types/network';

type LoginRole = Exclude<ActiveRole, 'LANDING'>;

interface LoginPageProps {
    role: LoginRole;
    onBack: () => void;
    onLoginSuccess: (token: string, user: {
        username: string;
        name: string;
        role: LoginRole;
    }) => void;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

const roleDetails = {
    USER: {
        title: 'User Login',
        subtitle: 'Access your intelligent city navigation workspace.',
        icon: Car,
        color: 'blue'
    },
    EMERGENCY: {
        title: 'Emergency Responder Login',
        subtitle: 'Access emergency routing and response coordination.',
        icon: Siren,
        color: 'red'
    },
    ADMIN: {
        title: 'Administrator Login',
        subtitle: 'Access city-wide traffic monitoring and control.',
        icon: ShieldCheck,
        color: 'purple'
    }
};

export const LoginPage: React.FC<LoginPageProps> = ({
    role,
    onBack,
    onLoginSuccess
}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const details = roleDetails[role];
    const RoleIcon = details.icon;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    role
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed. Check your credentials.');
            }

            onLoginSuccess(data.access_token, data.user);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to connect to the authentication server.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-[#0B0F19] relative overflow-hidden">

            <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

            <div className="relative w-full max-w-md">

                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to overview
                </button>

                <div className="rounded-3xl border border-slate-800 bg-[#111827]/95 p-7 sm:p-9 shadow-2xl">

                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                            <RoleIcon className="w-8 h-8 text-cyan-400" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <div className="text-xs font-mono text-cyan-400 tracking-widest mb-3">
                            URBANFLOW AI · SECURE ACCESS
                        </div>

                        <h1 className="text-2xl font-bold text-white">
                            {details.title}
                        </h1>

                        <p className="text-sm text-slate-400 mt-2">
                            {details.subtitle}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Username
                            </label>

                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                autoComplete="username"
                                className="w-full px-4 py-3 rounded-xl bg-[#0B0F19] border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                    size={17}
                                />

                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-[#0B0F19] border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-colors"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
                        >
                            {loading ? 'Verifying credentials...' : 'Secure Login'}
                            {!loading && <ArrowRight size={17} />}
                        </button>

                    </form>

                    <div className="mt-7 pt-6 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={15} className="text-emerald-400" />
                        Protected by UrbanFlow authentication
                    </div>

                </div>

                <p className="text-center text-xs text-slate-600 mt-5">
                    UrbanFlow AI · Intelligent Urban Traffic Management
                </p>
            </div>
        </div>
    );
};
