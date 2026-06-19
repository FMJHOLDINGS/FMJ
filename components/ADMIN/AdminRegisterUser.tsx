import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { 
    UserPlus, User, Lock, Shield, CheckCircle, AlertTriangle, 
    Loader2, Users, Trash2, Edit, Save, X, UserCheck, UserX, Clock, Building2, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// 1. CONSTANTS & TYPES (පද්ධතියට අදාළ මූලික සැකසුම්)
// ============================================================================
// 🟢 මෙතන AccessLevel එක හඳුන්වලා දීලා තියෙන නිසා AuthContext Error එක එන්නේ නෑ
export type AccessLevel = 'edit' | 'view' | 'none';

const APP_TABS = ['PRODUCTION', 'KPI', 'OEE', 'QUALITY', 'PLANNING', 'DELIVERY', 'STORES', 'ADMIN'];

const defaultPermissions: Record<string, AccessLevel> = {
    PRODUCTION: 'none', KPI: 'none', OEE: 'none', QUALITY: 'none', 
    PLANNING: 'none', DELIVERY: 'none', STORES: 'none', ADMIN: 'none'
};

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
const AdminRegisterUser = () => {
    const { userData } = useAuth();
    
    // --- View States ---
    const [activeView, setActiveView] = useState<'USERS' | 'REQUESTS'>('USERS');
    const [usersList, setUsersList] = useState<any[]>([]);
    const [requestsList, setRequestsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // --- Form States (Add & Edit දෙකටම භාවිතා වේ) ---
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [permissions, setPermissions] = useState<Record<string, AccessLevel>>(defaultPermissions);

    // ============================================================================
    // 3. DATA FETCHING (දත්ත ලබාගැනීම)
    // ============================================================================
    if (!userData) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm font-bold uppercase tracking-wider">Loading Access Data...</span>
            </div>
        );
    }

    const fetchData = async () => {
        if (!userData?.factoryId) return;
        setLoading(true);
        try {
            const qUsers = query(collection(db, "users"), where("factoryId", "==", userData.factoryId));
            const snapUsers = await getDocs(qUsers);
            setUsersList(snapUsers.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const qReq = query(collection(db, "user_requests"), where("factoryId", "==", userData.factoryId));
            const snapReq = await getDocs(qReq);
            setRequestsList(snapReq.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [userData]);

    // ============================================================================
    // 4. FORM OPERATIONS (Add / Edit / Reset)
    // ============================================================================
    
    // Form එක Clear කිරීම
    const resetForm = () => {
        setEditingUserId(null);
        setUsername('');
        setPassword('');
        setRole('user');
        setPermissions(defaultPermissions);
    };

    // Edit Button එක එබූ විට Form එක පිරවීම
    const handleEditClick = (user: any) => {
        setEditingUserId(user.id);
        setUsername(user.username);
        setPassword(user.password);
        setRole(user.role);
        setPermissions(user.permissions || defaultPermissions);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Form එක ගාවට උඩට යනවා
    };

    // User ව Save කිරීම හෝ Update කිරීම (එකම Function එකකින්)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.factoryId) return;
        
        try {
            const cleanUser = username.trim();

            if (editingUserId) {
                // ------ UPDATE EXISTING USER ------
                await updateDoc(doc(db, "users", editingUserId), {
                    username: cleanUser,
                    password,
                    role,
                    permissions
                });
                setMessage({ type: 'success', text: `User '${cleanUser}' updated successfully!` });
            } else {
                // ------ ADD NEW USER ------
                const q = query(collection(db, "users"), where("username", "==", cleanUser));
                if (!(await getDocs(q)).empty) throw new Error("Username already taken.");

                const userId = `USER_${Date.now()}`;
                await setDoc(doc(db, "users", userId), {
                    username: cleanUser,
                    password,
                    factoryId: userData.factoryId,
                    collectionName: userData.collectionName,
                    factoryName: userData.factoryName,
                    role,
                    permissions,
                    createdAt: new Date().toISOString()
                });
                setMessage({ type: 'success', text: `User '${cleanUser}' registered!` });
            }

            resetForm(); // වැඩේ ඉවර වුණාම Form එක clear කරනවා
            fetchData();
            setTimeout(() => setMessage(null), 3000); // තත්පර 3කින් මැසේජ් එක අයින් වෙනවා

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // ============================================================================
    // 5. OTHER ACTIONS (Delete / Approve / Reject)
    // ============================================================================
    const handleDelete = async (id: string) => {
        if(!window.confirm("Permanently delete this user?")) return;
        await deleteDoc(doc(db, "users", id));
        if (editingUserId === id) resetForm(); // Delete කරේ Edit කර කර හිටපු කෙනාව නම් Form එකත් Clear කරනවා
        fetchData();
    };

    const handleApprove = async (req: any) => {
        if(!window.confirm(`Approve access for ${req.username}?`)) return;
        try {
            const userId = `USER_${Date.now()}`;
            await setDoc(doc(db, "users", userId), {
                username: req.username,
                password: req.password,
                factoryId: req.factoryId,
                collectionName: req.collectionName,
                factoryName: req.factoryName,
                role: 'user',
                permissions: defaultPermissions,
                createdAt: new Date().toISOString()
            });
            await deleteDoc(doc(db, "user_requests", req.id));
            alert("User Approved Successfully!");
            fetchData();
        } catch (e) { alert("Error approving user"); }
    };

    const handleDecline = async (id: string) => {
        if(!window.confirm("Reject and delete this request?")) return;
        try {
            await deleteDoc(doc(db, "user_requests", id));
            fetchData();
        } catch (e) { alert("Error deleting request"); }
    };

    // ============================================================================
    // 6. UI RENDERING
    // ============================================================================
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="px-6 py-2">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-indigo-500"/> Access Manager
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userData.factoryName}</p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                    <button onClick={() => { setActiveView('USERS'); resetForm(); }} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeView === 'USERS' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Users size={16}/> Active Users
                    </button>
                    <button onClick={() => setActiveView('REQUESTS')} className={`relative px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeView === 'REQUESTS' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Clock size={16}/> Requests
                        {requestsList.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-lg animate-bounce">{requestsList.length}</span>}
                    </button>
                </div>
            </div>

            {/* --- VIEW: ACTIVE USERS --- */}
            {activeView === 'USERS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT PANEL: Form (Add & Edit) */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm h-fit sticky top-24">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            {editingUserId ? <Edit size={16} className="text-emerald-500"/> : <UserPlus size={16} className="text-indigo-500"/>} 
                            {editingUserId ? 'Edit User Details' : 'Add Manual User'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                            
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                <button type="button" onClick={() => setRole('user')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg uppercase ${role === 'user' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>User</button>
                                <button type="button" onClick={() => setRole('admin')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg uppercase ${role === 'admin' ? 'bg-white shadow text-rose-600' : 'text-slate-400'}`}>Admin</button>
                            </div>

                            <div className="mt-4 mb-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck size={14}/> Tab Permissions</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {APP_TABS.map(tab => (
                                        <div key={tab} className={`flex flex-col p-2 rounded-xl border transition-colors ${permissions[tab] !== 'none' ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1">{tab}</span>
                                            <select 
                                                value={permissions[tab]}
                                                onChange={(e) => setPermissions({...permissions, [tab]: e.target.value as AccessLevel})}
                                                className="text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-1 outline-none font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                            >
                                                <option value="none">None (Hide)</option>
                                                <option value="view">View Only</option>
                                                <option value="edit">View & Edit</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {message && <div className={`text-[10px] font-bold text-center p-2 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{message.text}</div>}

                            <div className="flex gap-2 pt-2">
                                {editingUserId && (
                                    <button type="button" onClick={resetForm} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-500 rounded-xl font-bold text-xs uppercase transition-colors">Cancel</button>
                                )}
                                <button type="submit" className={`flex-1 py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all ${editingUserId ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}>
                                    {editingUserId ? 'Update User' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT PANEL: User List */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
                        {usersList.map(user => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={user.id} className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all group flex flex-col justify-between ${editingUserId === user.id ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${user.role === 'admin' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                            {user.role === 'admin' ? <Shield size={18}/> : <User size={18}/>}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{user.username}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">{user.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditClick(user)} className="p-2 hover:bg-indigo-50 text-indigo-500 rounded-lg" title="Edit User"><Edit size={14}/></button>
                                        {user.id !== userData?.id && (
                                            <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg" title="Delete User"><Trash2 size={14}/></button>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg text-[10px] font-mono text-slate-500 flex justify-between items-center">
                                    <span>Pass: {user.password}</span>
                                    {user.permissions && (
                                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 px-2 py-0.5 rounded font-bold">
                                            {Object.values(user.permissions).filter(v => v !== 'none').length} Tabs Enabled
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- VIEW: REQUESTS --- */}
            {activeView === 'REQUESTS' && (
                <div className="space-y-4">
                    {requestsList.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">
                            <Clock size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4"/>
                            <p className="text-slate-400 font-bold text-sm">No pending requests</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {requestsList.map((req) => (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={req.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 border border-amber-200 dark:border-amber-500/20 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-amber-500"><UserPlus size={20}/></div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white">{req.username}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Building2 size={10}/> {req.factoryName}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApprove(req)} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg transition-all flex items-center justify-center gap-2"><UserCheck size={14}/> Approve</button>
                                            <button onClick={() => handleDecline(req.id)} className="flex-1 py-2 bg-white dark:bg-slate-700 hover:bg-rose-50 text-rose-500 border border-rose-200 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2"><UserX size={14}/> Reject</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default AdminRegisterUser;