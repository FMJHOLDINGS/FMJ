import { useState, useEffect, useCallback } from 'react';
import { QaService } from './QaService';

export const useQaManager = (collectionName: string) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);

    const fetchCategories = useCallback(async () => {
        if (!collectionName) return;
        try {
            setLoading(true);
            const data = await QaService.getQaSettings(collectionName);
            setMainCategories(data.mainCategories || []);
            setSubCategories(data.subCategories || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [collectionName]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const saveToDatabase = async (newMainList: any[], newSubList: any[]) => {
        if (!collectionName) return;
        setSaving(true);
        setSaveSuccess(false);
        try {
            await QaService.saveQaSettings(collectionName, newMainList, newSubList);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) { console.error(error); } finally { setSaving(false); }
    };

    return { loading, saving, saveSuccess, mainCategories, subCategories, setMainCategories, setSubCategories, saveToDatabase };
};