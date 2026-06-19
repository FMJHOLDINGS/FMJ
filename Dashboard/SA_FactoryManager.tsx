import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
// [FIX] writeBatch, query, where අලුතින් import කළා
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { 
  Building2, Plus, MapPin, Trash2, UserPlus, 
  Users, Edit, Save, X, ShieldCheck, Clock, UserCheck, UserX, Factory, Sparkles, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SA_FactoryManager = () => {
  // --- STATES ---
  const [factories, setFactories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Factory Creation States
  const [isCreating, setIsCreating] = useState(false);
  const [newFacName, setNewFacName] = useState('');
  const [newFacLocation, setNewFacLocation] = useState('');
  const [newFacAdminUser, setNewFacAdminUser] = useState(''); 
  const [newFacAdminPass, setNewFacAdminPass] = useState(''); 

  // User Management States
  const [selectedFactory, setSelectedFactory] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserParams, setNewUserParams] = useState({ username: '', password: '', role: 'user' });

  // 1. DATA LOADING
  const fetchData = async () => {
      setLoading(true);
      try {
          const facSnap = await getDocs(collection(db, "companies"));
          const userSnap = await getDocs(collection(db, "users"));
          const reqSnap = await getDocs(collection(db, "user_requests"));
          
          setFactories(facSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
          console.error("Error loading data", error);
      }
      setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. FACTORY DELETION LOGIC (FIXED) ---
  const handleDeleteFactory = async (factory: any) => {
      const confirmMsg = `WARNING: This will PERMANENTLY DELETE factory "${factory.name}".\n\nIt will also delete:\n1. All Production Data (DATA_COLLECTION)\n2. All Associated Users\n\nAre you sure?`;
      if(!window.confirm(confirmMsg)) return;
      
      setLoading(true);
      try {
          // A. Batch එකක් පටන් ගමු (එකවර ගොඩක් දේවල් මකන්න)
          const batch = writeBatch(db);

          // 1. Delete Factory Document
          batch.delete(doc(db, "companies", factory.id));

          // 2. Delete All Users associated with this factory
          const userQuery = query(collection(db, "users"), where("factoryId", "==", factory.id));
          const userSnapshot = await getDocs(userQuery);
          userSnapshot.docs.forEach((uDoc) => {
              batch.delete(uDoc.ref);
          });

          // Batch එක Commit කරනවා (Factory & Users මැකෙනවා)
          await batch.commit();

          // 3. Delete Main Data Collection (මේක වෙනම කරන්න වෙනවා මොකද Batch ලිමිට් නිසා)
          // Collection එකේ තියෙන Documents ඔක්කොම අරන් එකින් එක මකනවා
          if (factory.collectionName) {
              const dataColRef = collection(db, factory.collectionName);
              const dataSnapshot = await getDocs(dataColRef);
              
              // අලුත් Batch එකක් Data මැකීමට
              const dataBatch = writeBatch(db);
              let count = 0;
              
              dataSnapshot.docs.forEach((dDoc) => {
                  dataBatch.delete(dDoc.ref);
                  count++;
              });

              if (count > 0) {
                  await dataBatch.commit();
                  console.log(`Deleted ${count} production records.`);
              }
          }

          alert("✅ Factory and ALL associated data deleted successfully!");
          fetchData();

      } catch (error) {
          console.error("Delete Error:", error);
          alert("Error deleting data. Check console for details.");
      } finally {
          setLoading(false);
      }
  };

  // --- 3. CREATE FACTORY LOGIC ---
  const handleCreateFactory = async () => {
      if (!newFacName || !newFacLocation || !newFacAdminUser || !newFacAdminPass) {
          return alert("Please fill ALL fields including Admin details.");
      }

      const cleanFacName = newFacName.trim();
      const factoryId = `FAC_${cleanFacName.toUpperCase().replace(/[^A-Z0-9]/g, '')}_${Date.now()}`;
      const collectionName = `DATA_FAC_${cleanFacName.toUpperCase().replace(/[^A-Z0-9]/g, '')}_${Date.now()}`;
      const userId = `USER_${Date.now()}`;

      try {
          await setDoc(doc(db, "companies", factoryId), {
              name: cleanFacName,
              location: newFacLocation.trim(),
              collectionName: collectionName,
              createdAt: new Date().toISOString()
          });

          await setDoc(doc(db, "users", userId), {
              username: newFacAdminUser.trim(),
              password: newFacAdminPass,
              factoryId: factoryId,
              collectionName: collectionName,
              factoryName: cleanFacName,
              role: 'admin',
              createdAt: new Date().toISOString()
          });

          alert(`✅ Success! Factory Created.`);
          setIsCreating(false); 
          setNewFacName(''); setNewFacLocation(''); 
          setNewFacAdminUser(''); setNewFacAdminPass('');
          fetchData();

      } catch (error) {
          console.error(error);
          alert("Error creating factory.");
      }
  };

  // --- 4. USER MANAGEMENT LOGIC ---
  const handleDeleteUser = async (id: string) => {
      if(!window.confirm("Delete User?")) return;
      await deleteDoc(doc(db, "users", id)); fetchData();
  };

  const handleApproveRequest = async (req: any) => {
      if(!window.confirm(`Approve ${req.username}?`)) return;
      try {
          const userId = `USER_${Date.now()}`;
          await setDoc(doc(db, "users", userId), {
              username: req.username, password: req.password, factoryId: req.factoryId,
              collectionName: req.collectionName, factoryName: req.factoryName, role: 'user',
              createdAt: new Date().toISOString()
          });
          await deleteDoc(doc(db, "user_requests", req.id));
          alert("User Approved!"); fetchData();
      } catch (error) { alert("Error approving"); }
  };

  const handleDeclineRequest = async (id: string) => {
      if(!window.confirm("Reject request?")) return;
      await deleteDoc(doc(db, "user_requests", id)); fetchData();
  };

  const handleAddUser = async () => {
      if (!selectedFactory || !newUserParams.username) return;
      const id = `USER_${Date.now()}`;
      await setDoc(doc(db, "users", id), {
          ...newUserParams, username: newUserParams.username.trim(),
          factoryId: selectedFactory.id, collectionName: selectedFactory.collectionName, 
          factoryName: selectedFactory.name, createdAt: new Date().toISOString()
      });
      alert("User Added!"); setIsAddingUser(false); setNewUserParams({ username: '', password: '', role: 'user' }); fetchData();
  };

  const handleUpdateUser = async () => {
      if (!editingUser) return;
      await updateDoc(doc(db, "users", editingUser.id), { 
          username: editingUser.username.trim(), password: editingUser.password, role: editingUser.role 
      });
      alert("User Updated!"); setEditingUser(null); fetchData();
  };

  const factoryUsers = selectedFactory ? users.filter(u => u.factoryId === selectedFactory.id) : [];

  return (
    <div className="space-y-8 pb-24 font-sans text-slate-200">
        
        {/* --- PENDING REQUESTS BAR --- */}
        {requests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-500/20 p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                    <Clock size={18} /> Pending Approvals <span className="bg-amber-500 text-black px-2 py-0.5 rounded-md text-[10px]">{requests.length}</span>
                </h3>
                <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-1">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-3 shrink-0">
                            <div><p className="font-bold text-white text-xs">{req.username}</p><p className="text-[9px] text-slate-400">{req.factoryName}</p></div>
                            <div className="flex gap-1">
                                <button onClick={() => handleApproveRequest(req)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"><UserCheck size={14}/></button>
                                <button onClick={() => handleDeclineRequest(req.id)} className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-colors"><UserX size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2 relative z-10">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-600/30"><LayoutGrid size={24} className="text-white"/></div>
                    Factory Hub
                </h2>
                <p className="text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest pl-1">System Administration Console</p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsCreating(true)} className="px-5 py-2.5 bg-white text-slate-900 hover:bg-indigo-50 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl shadow-white/10">
                <Plus size={16} strokeWidth={3}/> Register Factory
            </motion.button>
        </div>

        {/* --- COMPACT FACTORY GRID --- */}
        {loading ? (
            <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {factories.map((factory, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        transition={{ delay: idx * 0.05 }} 
                        key={factory.id} 
                        className="bg-[#1E293B]/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl hover:border-indigo-500/40 hover:bg-[#1E293B]/80 transition-all group relative overflow-hidden shadow-lg"
                    >
                        {/* Background Glow */}
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] group-hover:bg-indigo-500/20 transition-all"></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-800 rounded-xl text-indigo-400 border border-white/5 group-hover:scale-110 transition-transform"><Building2 size={20} /></div>
                                    <div>
                                        <h3 className="text-sm font-black text-white leading-tight">{factory.name}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5"><MapPin size={10}/> {factory.location}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-900/50 px-2 py-1 rounded-lg">
                                    <Users size={12} className="text-emerald-400"/> {users.filter(u => u.factoryId === factory.id).length} Users
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                    <button onClick={() => setSelectedFactory(factory)} className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors" title="Manage Users"><Users size={14}/></button>
                                    <button onClick={() => handleDeleteFactory(factory)} className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-colors" title="Delete Factory"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}

        {/* --- MODALS (Modernized) --- */}
        <AnimatePresence>
            
            {/* 1. NEW FACTORY MODAL */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0f172a] w-full max-w-sm p-6 rounded-[2rem] border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <h3 className="text-lg font-black text-white mb-5 uppercase tracking-tight flex items-center gap-2"><Sparkles size={18} className="text-indigo-400"/> New Factory</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Factory Details</label>
                                <input className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white text-xs font-bold outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all" value={newFacName} onChange={e => setNewFacName(e.target.value)} placeholder="Factory Name" />
                                <input className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white text-xs font-bold outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all" value={newFacLocation} onChange={e => setNewFacLocation(e.target.value)} placeholder="Location" />
                            </div>
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <label className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1"><ShieldCheck size={10}/> Admin Access</label>
                                <input className="w-full bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500 transition-all" value={newFacAdminUser} onChange={e => setNewFacAdminUser(e.target.value)} placeholder="Admin Username" />
                                <input className="w-full bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500 transition-all" value={newFacAdminPass} onChange={e => setNewFacAdminPass(e.target.value)} placeholder="Admin Password" />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded-xl text-slate-400 font-bold text-xs hover:bg-slate-800 transition-all">Cancel</button>
                            <button onClick={handleCreateFactory} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all">Create</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* 2. MANAGE USERS MODAL */}
            {selectedFactory && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-[#020617] w-full max-w-4xl h-[80vh] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"><Factory className="text-indigo-400" size={24}/></div>
                                <div><h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedFactory.name}</h3><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">User Management Portal</p></div>
                            </div>
                            <button onClick={() => setSelectedFactory(null)} className="p-2 bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white rounded-full transition-all"><X size={20}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2"><Users size={16} className="text-emerald-500"/> Team Members</h4>
                                <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-2 shadow-lg"><UserPlus size={14}/> Add User</button>
                            </div>
                            
                            {/* Add User Form */}
                            <AnimatePresence>
                                {isAddingUser && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl mb-6 overflow-hidden">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                            <input className="bg-black border border-slate-700 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:border-emerald-500" placeholder="Username" value={newUserParams.username} onChange={e => setNewUserParams({...newUserParams, username: e.target.value})} />
                                            <input className="bg-black border border-slate-700 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:border-emerald-500" placeholder="Password" value={newUserParams.password} onChange={e => setNewUserParams({...newUserParams, password: e.target.value})} />
                                            <select className="bg-black border border-slate-700 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:border-emerald-500" value={newUserParams.role} onChange={e => setNewUserParams({...newUserParams, role: e.target.value})}><option value="user">USER</option><option value="admin">ADMIN</option></select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleAddUser} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold text-xs uppercase">Save User</button>
                                            <button onClick={() => setIsAddingUser(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs uppercase">Cancel</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* User List */}
                            <div className="grid grid-cols-1 gap-3">
                                {factoryUsers.length === 0 ? (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs font-bold uppercase">No users found</div>
                                ) : (
                                    factoryUsers.map((user, idx) => (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} key={user.id} className="bg-slate-800/50 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 group hover:bg-slate-800 hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-4 w-full">
                                                <div className={`p-2.5 rounded-lg ${user.role === 'admin' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'}`}>{user.role === 'admin' ? <ShieldCheck size={20}/> : <Users size={20}/>}</div>
                                                
                                                {editingUser?.id === user.id ? (
                                                    <div className="flex gap-2 flex-1">
                                                        <input className="bg-black border border-indigo-500/50 p-2 rounded text-white text-xs font-bold w-full" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
                                                        <input className="bg-black border border-indigo-500/50 p-2 rounded text-white text-xs font-bold w-full" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{user.username}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-slate-500 font-mono bg-black/20 px-1.5 rounded">PWD: {user.password}</span>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${user.role === 'admin' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{user.role}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {editingUser?.id === user.id ? (
                                                    <><button onClick={handleUpdateUser} className="p-2 bg-emerald-500 text-white rounded-lg"><Save size={16}/></button><button onClick={() => setEditingUser(null)} className="p-2 bg-slate-700 text-white rounded-lg"><X size={16}/></button></>
                                                ) : (
                                                    <><button onClick={() => setEditingUser(user)} className="p-2 bg-slate-700 hover:bg-indigo-600 text-white rounded-lg transition-colors"><Edit size={16}/></button><button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-slate-700 hover:bg-rose-600 text-white rounded-lg transition-colors"><Trash2 size={16}/></button></>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default SA_FactoryManager;