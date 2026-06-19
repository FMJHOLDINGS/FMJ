import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlanningService } from './PlanningService';
import { ProductItem } from './PlanningTypes';

export interface MachineItem {
    id: string;
    name: string;
    type: 'IM' | 'BM';
}

export const useProductDBLogic = () => {
    const { userData } = useAuth();
    
    // --- 1. DATA STATES ---
    const [products, setProducts] = useState<any[]>([]); 
    const [machines, setMachines] = useState<MachineItem[]>([]); 
    const [loading, setLoading] = useState(true);
    
    // --- 2. UI STATES ---
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'IM' | 'BM'>('IM'); 
    
    // Edit කිරීම සඳහා පමණක් Data තබා ගනී (Lag වීම නැවැත්වීමට Form Data මෙහි තබා නොගනී)
    const [editingProduct, setEditingProduct] = useState<any | null>(null);

    // --- 3. LOAD DATA (Products & Machines) ---
    useEffect(() => {
        if (!userData?.collectionName) return;
        setLoading(true);

        let unsubProducts: () => void;
        let unsubMachines: () => void;

        // Active Tab එක අනුව Products Load කිරීම
        if (activeTab === 'IM') {
            unsubProducts = PlanningService.subscribeToIMProducts(userData.collectionName, (loaded) => { setProducts(loaded); setLoading(false); });
        } else {
            unsubProducts = PlanningService.subscribeToBMProducts(userData.collectionName, (loaded) => { setProducts(loaded); setLoading(false); });
        }

        // Machines Load කිරීම
        if (PlanningService.subscribeToMachines) {
            unsubMachines = PlanningService.subscribeToMachines(userData.collectionName, (loaded: MachineItem[]) => { setMachines(loaded || []); });
        }

        return () => { 
            if (unsubProducts) unsubProducts(); 
            if (unsubMachines) unsubMachines();
        };
    }, [userData, activeTab]); 

    // --- 4. FILTER LOGIC ---
    const filteredProducts = products.filter(p => 
        p.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.customer?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- 5. MODAL HANDLING ---
    const openModal = (product?: any) => {
        setEditingProduct(product || null); // Product එකක් තිබ්බොත් Edit, නැත්තම් Add New
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingProduct(null); };

    // --- 6. SAVE PRODUCT (From Isolated Modal Component) ---
    // --- 6. SAVE PRODUCT (From Isolated Modal Component) ---
    const handleSave = async (submittedData: any) => {
        if (!userData?.collectionName) return;

        // ගණනය කිරීම් සහ දත්ත පිරිසිදු කිරීම
        const cleanData = {
            ...submittedData,
            weight: Number(submittedData.weight) || 0,
            standardCycleTime: Number(submittedData.standardCycleTime) || 0,
            actualCycleTime: Number(submittedData.actualCycleTime) || 0,
            stdCavities: Number(submittedData.stdCavities) || 0,
            actualCavities: Number(submittedData.actualCavities) || 0,
            packingQty: Number(submittedData.packingQty) || 0,
            targetPerHr: Math.round((3600 / (Number(submittedData.actualCycleTime) || 1)) * (Number(submittedData.actualCavities) || 1)),
            
            materialPercent: Number(submittedData.materialPercent) || 0,
            mbPercent: Number(submittedData.mbPercent) || 0,
            crushPercent: Number(submittedData.crushPercent) || 0,
        };
    

        let updatedList = [...products];

        if (editingProduct) {
            // Update
            updatedList = updatedList.map(p => p.id === editingProduct.id ? { ...p, ...cleanData } : p);
        } else {
            // Add New
            const newProduct: any = { id: `prod_${Date.now()}`, ...cleanData, itemName: cleanData.itemName || 'New Item' };
            updatedList.push(newProduct);
        }

        // 🟢 වෙනස: Database එකට යවන්න කලින් Modal එක වසන්න. 
        // මේ නිසා බොත්තම එබූ සැණින් කිසිම හිරවීමක් නැතුව Popup එක වැසී යයි (Super Fast Feel).
        closeModal();

        // ඉන්පසු Background එකේදී දත්ත Database එකට සේව් වේ.
        try {
            if (activeTab === 'IM') {
                await PlanningService.saveIMProducts(userData.collectionName, updatedList);
            } else {
                await PlanningService.saveBMProducts(userData.collectionName, updatedList);
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("Failed to save the product. Please check your connection.");
        }
    };

    // --- 7. DELETE PRODUCT ---
    const handleDelete = async (id: string) => {
        if (!userData?.collectionName || !window.confirm("Are you sure you want to delete this product?")) return;
        const updatedList = products.filter(p => p.id !== id);
        if (activeTab === 'IM') await PlanningService.saveIMProducts(userData.collectionName, updatedList);
        else await PlanningService.saveBMProducts(userData.collectionName, updatedList);
    };

    // --- 8. MACHINE MASTER LOGIC ---
    const handleSaveMachine = async (newMachine: MachineItem) => {
        if (!userData?.collectionName) return;
        const updatedMachines = [...machines, newMachine];
        setMachines(updatedMachines);
        if (PlanningService.saveMachines) await PlanningService.saveMachines(userData.collectionName, updatedMachines);
    };

    const handleDeleteMachine = async (id: string) => {
        if (!userData?.collectionName || !window.confirm("Delete this machine?")) return;
        const updatedMachines = machines.filter(m => m.id !== id);
        setMachines(updatedMachines);
        if (PlanningService.saveMachines) await PlanningService.saveMachines(userData.collectionName, updatedMachines);
    };

    return {
        products: filteredProducts, totalCount: filteredProducts.length, machines, loading,
        searchQuery, setSearchQuery, activeTab, setActiveTab,
        isModalOpen, openModal, closeModal,
        handleSave, handleDelete, editingProduct,
        handleSaveMachine, handleDeleteMachine 
    };
};