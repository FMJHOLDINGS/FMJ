import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlanningService } from './PlanningService';
import { IMJobPlan } from './PlanningTypes';

export const usePlanningManager = (planType: 'IM' | 'BM') => {
  const { userData } = useAuth();
  const collectionName = userData?.collectionName; 

  const [plans, setPlans] = useState<IMJobPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isIdle, setIsIdle] = useState(false); // 🟢 අලුත්: Idle State එක

 // 🟢 1. Idle Detection Logic (Auto-Resume ක්‍රමය)
 useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            setIsIdle(true);
            window.dispatchEvent(new Event('app-idle')); // UI එකට අඳුරු වීමට පණිවිඩය යැවීම
        }, 15 * 60 * 1000); // විනාඩි 15
    };

    // 🟢 මවුස් එක හෙලවූ විට හෝ ටයිප් කළ විට ස්වයංක්‍රීයව Resume වීම
    const handleActivity = () => { 
        if (isIdle) {
            setIsIdle(false);
            window.dispatchEvent(new Event('app-resume')); // UI එකට Resume පණිවිඩය යැවීම
        }
        resetTimer(); 
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    resetTimer();

    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
    };
  }, [isIdle]);

  
// 🟢 2. Data Load කිරීම (isIdle ඉවත් කර ඇත - එබැවින් තිරය අඳුරු වුවත් Background එකේ අලුත් දත්ත Sync වේ)
useEffect(() => {
    if (!collectionName) {
        setLoading(false);
        return;
    }

    setLoading(true); 
    let unsubscribe: () => void;

    if (planType === 'IM') {
        unsubscribe = PlanningService.subscribeToIMPlans(collectionName, (data) => {
            setPlans(data as IMJobPlan[]);
            setLoading(false);
        });
    } else {
        unsubscribe = PlanningService.subscribeToBMPlans(collectionName, (data) => {
            setPlans(data as IMJobPlan[]);
            setLoading(false);
        });
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [collectionName, planType])




  // 3. Data Save කිරීම (පෙර පරිදිම)
  const savePlans = useCallback(async (newPlans: IMJobPlan[]) => {
    if (!collectionName) return;
    
    const activePlans = newPlans.filter(p => p.status !== 'completed');
    const completedPlans = newPlans.filter(p => p.status === 'completed');

    setPlans(activePlans); 

    if (planType === 'IM') {
        await PlanningService.saveIMPlans(collectionName, activePlans);
    } else {
        await PlanningService.saveBMPlans(collectionName, activePlans);
    }

    if (completedPlans.length > 0) {
        await PlanningService.archiveCompletedJobs(collectionName, planType, completedPlans);
    }
  }, [collectionName, planType]);

  // 🟢 අලුතින් එක් කළ: Delete Function එක UI එකට ලබා දීම
  const deletePlan = useCallback(async (jobDocId: string) => {
    if (!collectionName || !jobDocId) return;
    if (planType === 'IM') {
        await PlanningService.deleteIMPlan(collectionName, jobDocId);
    } else {
        await PlanningService.deleteBMPlan(collectionName, jobDocId);
    }
  }, [collectionName, planType]);

  // 🟢 වැදගත්ම තැන: මෙතන return එක ඇතුළේ deletePlan තියෙන්නම ඕනේ
  return { plans, savePlans, deletePlan, loading };
};