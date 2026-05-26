'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Animal {
  id: string;
  name: string;
  speciesId: number;
  birthDate?: string;
  sex?: string;
  notes?: string;
  photos?: string[];
}

interface Routine {
  id: string;
  name?: string;
  type: string;
  frequency: string;
  schedule: any;
  active: boolean;
}

interface HealthRecord {
  id: string;
  type: string;
  title: string;
  date: string;
  notes?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

interface Species {
  key: number;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
}

export default function AnimalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [resolvedParams, setResolvedParams] = useState<{
    locale: string;
    id: string;
  } | null>(null);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [routineType, setRoutineType] = useState('nourrissage');
  const [routineFrequency, setRoutineFrequency] = useState('daily');
  const [routineTime, setRoutineTime] = useState('08:00');
  const [routineDate, setRoutineDate] = useState('');
  const [routineWeekDay, setRoutineWeekDay] = useState(1);
  const [routineDayOfMonth, setRoutineDayOfMonth] = useState(1);
  const [routineIntervalHours, setRoutineIntervalHours] = useState(2);
  const [routineActive, setRoutineActive] = useState(true);
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [routineError, setRoutineError] = useState('');
  const [showDeleteRoutineConfirm, setShowDeleteRoutineConfirm] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<string | null>(null);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [speciesHealth, setSpeciesHealth] = useState<any>(null);
  const [speciesLegislation, setSpeciesLegislation] = useState<any>(null);
  const [speciesEquipment, setSpeciesEquipment] = useState<any>(null);
  const [speciesFood, setSpeciesFood] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('health');
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [editingHealthId, setEditingHealthId] = useState<string | null>(null);
  const [healthFormType, setHealthFormType] = useState<string>('vaccine');
  const [healthFormTitle, setHealthFormTitle] = useState('');
  const [healthFormDate, setHealthFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [healthFormNotes, setHealthFormNotes] = useState('');
  const [healthError, setHealthError] = useState('');
  const [healthSubmitting, setHealthSubmitting] = useState(false);
  const [healthDeletingId, setHealthDeletingId] = useState<string | null>(null);
  const [showEditAnimalModal, setShowEditAnimalModal] = useState(false);
  const [editAnimalName, setEditAnimalName] = useState('');
  const [editAnimalBirthDate, setEditAnimalBirthDate] = useState('');
  const [editAnimalSex, setEditAnimalSex] = useState('');
  const [editAnimalNotes, setEditAnimalNotes] = useState('');
  const [editAnimalProfilePhotoUrl, setEditAnimalProfilePhotoUrl] = useState('');
  const [editAnimalSubmitting, setEditAnimalSubmitting] = useState(false);
  const [editAnimalError, setEditAnimalError] = useState('');
  const [avatarPhotoUploading, setAvatarPhotoUploading] = useState(false);
  const avatarPhotoInputRef = useRef<HTMLInputElement>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && token && resolvedParams) {
      fetchAnimalData();
    }
  }, [user, token, resolvedParams]);

  useEffect(() => {
    if (showEditAnimalModal && animal) {
      setEditAnimalName(animal.name);
      setEditAnimalBirthDate(animal.birthDate ? animal.birthDate.slice(0, 10) : '');
      setEditAnimalSex(animal.sex || '');
      setEditAnimalNotes(animal.notes || '');
      setEditAnimalProfilePhotoUrl(animal.photos?.[0] || '');
      setEditAnimalError('');
    }
  }, [showEditAnimalModal, animal]);

  const fetchAnimalData = async () => {
    if (!token || !resolvedParams) return;

    try {
      // Fetch animal details
      const animalData = await api.getAnimal(resolvedParams.id, token);
      if (animalData.statusCode === 404 || animalData.error) {
        setError('Animal not found');
        setLoading(false);
        return;
      }
      setAnimal(animalData);

      // Fetch species info
      try {
        const speciesData = await api.getSpecies(animalData.speciesId.toString()) as Species;
        setSpecies(speciesData);
        
        // Fetch species health info
        try {
          const healthData = await api.getSpeciesHealth(animalData.speciesId, undefined, resolvedParams.locale);
          setSpeciesHealth(healthData);
        } catch (e) {
          console.error('Error fetching species health:', e);
        }

        // Fetch species legislation info (API returns { editorial: [{ country, status, details, sources }] })
        try {
          const legislationData = await api.getSpeciesLegislation(String(animalData.speciesId));
          setSpeciesLegislation(legislationData);
        } catch (e) {
          console.error('Error fetching species legislation:', e);
        }

        // Fetch species equipment recommendations
        try {
          const equipmentData = await api.getRecommendedEquipment(animalData.speciesId);
          setSpeciesEquipment(equipmentData);
        } catch (e) {
          console.error('Error fetching species equipment:', e);
        }

        // Fetch species food recommendations
        try {
          const speciesName = speciesData.canonicalName || speciesData.scientificName;
          const foodData = await api.getFoodBySpecies(speciesName) as { products?: any[] };
          setSpeciesFood(foodData.products || []);
        } catch (e) {
          console.error('Error fetching species food:', e);
        }
      } catch (e) {
        console.error('Error fetching species:', e);
      }

      // Fetch routines
      try {
        const routinesData = await api.getAnimalRoutines(resolvedParams.id, token);
        setRoutines(Array.isArray(routinesData) ? routinesData : []);
      } catch (e) {
        console.error('Error fetching routines:', e);
      }

      // Fetch health records (carnet de santé)
      try {
        const records = await api.getAnimalHealthRecords(resolvedParams.id, token);
        setHealthRecords(Array.isArray(records) ? records : []);
      } catch {
        setHealthRecords([]);
      }
    } catch (error) {
      const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
      const isAuthError = msg.includes('unauthorized') || msg.includes('non autorisé') || msg.includes('forbidden') || msg.includes('403') || msg.includes('401');
      if (isAuthError) {
        logout();
        router.push('/login');
        return;
      }
      console.error('Error fetching animal:', error);
      setError('Error loading animal data');
    } finally {
      setLoading(false);
    }
  };

  const getRoutineTypeName = (type: string): string => {
    const types: Record<string, string> = {
      nourrissage: t('routines.types.feeding'),
      nettoyage: t('routines.types.cleaning'),
      uvb: t('routines.types.uvb'),
      controle: t('routines.types.health'),
      entretien: t('routines.types.cleaning'),
    };
    return types[type] || type;
  };

  const getFrequencyName = (frequency: string): string => {
    const frequencies: Record<string, string> = {
      daily: t('routines.frequencies.daily'),
      every_2_days: t('routines.frequencies.every_2_days'),
      every_3_days: t('routines.frequencies.every_3_days'),
      weekly: t('routines.frequencies.weekly'),
      monthly: t('routines.frequencies.monthly'),
      once: t('routines.frequencies.once'),
      hourly: t('routines.frequencies.hourly'),
      custom: t('routines.frequencies.custom'),
    };
    return frequencies[frequency] || frequency;
  };

  const getSexName = (sex?: string): string => {
    if (!sex) return t('animals.unknown');
    const sexes: Record<string, string> = {
      male: t('animals.male'),
      female: t('animals.female'),
      unknown: t('animals.unknown'),
    };
    return sexes[sex] || sex;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleDeleteAnimal = async () => {
    if (!animal || !token) return;
    
    setIsDeleting(true);
    try {
      await api.deleteAnimal(animal.id, token);
      router.push('/mes-animaux');
    } catch (err) {
      console.error('Error deleting animal:', err);
      setError(t('animals.errorDeleting') || 'Erreur lors de la suppression');
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    }
  };

  const openRoutineModalForCreate = () => {
    setEditingRoutineId(null);
    setRoutineName('');
    setRoutineType('nourrissage');
    setRoutineFrequency('daily');
    setRoutineTime('08:00');
    setRoutineDate('');
    setRoutineWeekDay(1);
    setRoutineDayOfMonth(1);
    setRoutineIntervalHours(2);
    setRoutineActive(true);
    setRoutineError('');
    setShowRoutineModal(true);
  };

  const openRoutineModalForEdit = (routine: Routine) => {
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name || '');
    setRoutineType(routine.type);
    const sch = routine.schedule as { time?: string; recurrence?: string; date?: string; weekDay?: number; dayOfMonth?: number; intervalHours?: number } | undefined;
    const freq = sch?.recurrence ?? routine.frequency ?? 'daily';
    setRoutineFrequency(freq);
    const time = sch?.time ?? routine.schedule?.time ?? '08:00';
    setRoutineTime(typeof time === 'string' ? time : '08:00');
    setRoutineDate(sch?.date ?? '');
    setRoutineWeekDay(typeof sch?.weekDay === 'number' ? sch.weekDay : 1);
    setRoutineDayOfMonth(typeof sch?.dayOfMonth === 'number' ? sch.dayOfMonth : 1);
    setRoutineIntervalHours(typeof sch?.intervalHours === 'number' ? sch.intervalHours : 2);
    setRoutineActive(routine.active);
    setRoutineError('');
    setShowRoutineModal(true);
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal || !token) return;

    setRoutineError('');
    setIsCreatingRoutine(true);

    const schedule: Record<string, unknown> = {
      time: routineTime,
      recurrence: routineFrequency,
    };
    if (routineFrequency === 'once' && routineDate) schedule.date = routineDate;
    if (routineFrequency === 'weekly') schedule.weekDay = routineWeekDay;
    if (routineFrequency === 'monthly') schedule.dayOfMonth = routineDayOfMonth;
    if (routineFrequency === 'hourly') schedule.intervalHours = routineIntervalHours;

    const payload = {
      name: routineName || undefined,
      type: routineType,
      frequency: routineFrequency,
      schedule,
      active: routineActive,
    };

    try {
      if (editingRoutineId) {
        await api.updateRoutine(animal.id, editingRoutineId, payload, token);
      } else {
        await api.createRoutine(animal.id, { ...payload, active: true }, token);
      }
      setShowRoutineModal(false);
      setEditingRoutineId(null);
      setRoutineName('');
      setRoutineType('nourrissage');
      setRoutineFrequency('daily');
      setRoutineTime('08:00');
      setRoutineDate('');
      setRoutineWeekDay(1);
      setRoutineDayOfMonth(1);
      setRoutineIntervalHours(2);
      setRoutineActive(true);
      await fetchAnimalData();
    } catch (err) {
      console.error('Error saving routine:', err);
      setRoutineError(
        editingRoutineId
          ? (t('animals.errorUpdatingRoutine') || 'Erreur lors de la modification')
          : (t('animals.errorCreatingRoutine') || 'Erreur lors de la création')
      );
    } finally {
      setIsCreatingRoutine(false);
    }
  };

  const handleDeleteRoutine = async () => {
    if (!animal || !token || !routineToDelete) return;
    setIsDeletingRoutine(true);
    try {
      await api.deleteRoutine(animal.id, routineToDelete, token);
      setShowDeleteRoutineConfirm(false);
      setRoutineToDelete(null);
      await fetchAnimalData();
    } catch (err) {
      console.error('Error deleting routine:', err);
    } finally {
      setIsDeletingRoutine(false);
    }
  };

  const handleLoadHistory = async () => {
    if (!animal || !token) return;

    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const historyData = await api.getAnimalHistory(animal.id, token);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Error loading history:', err);
      setHistoryError(t('animals.errorLoadingHistory') || 'Erreur lors du chargement');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistoryModal = async () => {
    setShowHistoryModal(true);
    if (history.length === 0) {
      await handleLoadHistory();
    }
  };

  const getHealthRecordTypeName = (type: string): string => {
    const key = `animals.healthRecordTypes.${type}` as any;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const openHealthModalForCreate = () => {
    setEditingHealthId(null);
    setHealthFormType('vaccine');
    setHealthFormTitle('');
    setHealthFormDate(new Date().toISOString().slice(0, 10));
    setHealthFormNotes('');
    setHealthError('');
    setShowHealthModal(true);
  };

  const openHealthModalForEdit = (record: HealthRecord) => {
    setEditingHealthId(record.id);
    setHealthFormType(record.type);
    setHealthFormTitle(record.title);
    setHealthFormDate(record.date ? record.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setHealthFormNotes(record.notes || '');
    setHealthError('');
    setShowHealthModal(true);
  };

  const handleSaveHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal || !token || !healthFormTitle.trim()) return;
    setHealthSubmitting(true);
    setHealthError('');
    try {
      if (editingHealthId) {
        await api.updateAnimalHealthRecord(
          animal.id,
          editingHealthId,
          {
            type: healthFormType,
            title: healthFormTitle.trim(),
            date: healthFormDate,
            notes: healthFormNotes.trim() || undefined,
          },
          token
        );
      } else {
        await api.createAnimalHealthRecord(
          animal.id,
          {
            type: healthFormType,
            title: healthFormTitle.trim(),
            date: healthFormDate,
            notes: healthFormNotes.trim() || undefined,
          },
          token
        );
      }
      setShowHealthModal(false);
      await fetchAnimalData();
    } catch (err) {
      console.error('Error saving health record:', err);
      setHealthError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setHealthSubmitting(false);
    }
  };

  const handleDeleteHealthRecord = async (recordId: string) => {
    if (!animal || !token) return;
    setHealthDeletingId(recordId);
    try {
      await api.deleteAnimalHealthRecord(animal.id, recordId, token);
      await fetchAnimalData();
    } catch (err) {
      console.error('Error deleting health record:', err);
    } finally {
      setHealthDeletingId(null);
    }
  };

  const handleAvatarPhotoClick = () => {
    avatarPhotoInputRef.current?.click();
  };

  const handleAvatarPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !animal || !token) {
      e.target.value = '';
      return;
    }
    setAvatarPhotoUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      await api.updateAnimal(animal.id, { photos: [dataUrl] }, token);
      await fetchAnimalData();
    } catch (err) {
      console.error('Error updating avatar photo:', err);
    } finally {
      setAvatarPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveEditAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal || !token || !editAnimalName.trim()) return;
    setEditAnimalSubmitting(true);
    setEditAnimalError('');
    try {
      await api.updateAnimal(
        animal.id,
        {
          name: editAnimalName.trim(),
          birthDate: editAnimalBirthDate || undefined,
          sex: editAnimalSex || undefined,
          notes: editAnimalNotes.trim() || undefined,
          photos: editAnimalProfilePhotoUrl.trim() ? [editAnimalProfilePhotoUrl.trim()] : [],
        },
        token
      );
      await fetchAnimalData();
      setShowEditAnimalModal(false);
    } catch (err) {
      console.error('Error updating animal:', err);
      setEditAnimalError(err instanceof Error ? err.message : t('animals.errorAdding'));
    } finally {
      setEditAnimalSubmitting(false);
    }
  };

  const handleOpenQR = async () => {
    if (!animal || !token || !resolvedParams?.locale) return;
    setQrLoading(true);
    setShowQRModal(true);
    setQrDataUrl('');
    setQrUrl('');
    try {
      const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/${resolvedParams.locale}` : '';
      const { url } = await api.getAnimalPublicLink(animal.id, token, baseUrl);
      const QRCodeModule = await import('qrcode');
      const dataUrl = await QRCodeModule.default.toDataURL(url, { width: 280, margin: 2 });
      setQrDataUrl(dataUrl);
      setQrUrl(url);
    } catch (e) {
      console.error('QR error:', e);
    } finally {
      setQrLoading(false);
    }
  };

  if (authLoading || loading || !resolvedParams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            {error || 'Animal not found'}
          </p>
          <Link
            href="/mes-animaux"
            className="text-emerald-600 hover:text-emerald-700"
          >
            {t('common.back')} {t('common.myAnimals')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 min-w-0">
        <nav className="text-sm text-gray-500">
          <Link href="/mes-animaux" className="hover:text-emerald-600">
            {t('animals.myAnimals')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800 dark:text-white">{animal.name}</span>
        </nav>
      </div>

      {/* Animal Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-6 sm:py-8">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 min-w-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 min-w-0">
              <input
                ref={avatarPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden
                onChange={handleAvatarPhotoFile}
              />
              <button
                type="button"
                onClick={handleAvatarPhotoClick}
                disabled={avatarPhotoUploading}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold shrink-0 overflow-hidden ring-2 ring-white/30 hover:ring-white/50 hover:bg-white/25 transition-all disabled:opacity-70 cursor-pointer"
                title={t('animals.changePhoto')}
              >
                {avatarPhotoUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                ) : animal.photos?.[0] ? (
                  <img
                    src={animal.photos[0]}
                    alt={animal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  animal.name.charAt(0).toUpperCase()
                )}
              </button>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{animal.name}</h1>
                {species && (
                  <Link 
                    href={`/species/${animal.speciesId}`}
                    className="text-lg opacity-90 hover:opacity-100 hover:underline"
                  >
                    {species.canonicalName || species.scientificName}
                  </Link>
                )}
                <div className="flex gap-4 mt-2 text-sm opacity-80">
                  {animal.birthDate && (
                    <span>{t('animals.birthDate')}: {formatDate(animal.birthDate)}</span>
                  )}
                  <span>{t('animals.sex')}: {getSexName(animal.sex)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowEditAnimalModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('animals.editAnimal')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Care advice block */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                {t('species.careAdvice')}
              </h2>
              
              {species ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Conseils de soins pour votre {species.canonicalName || species.scientificName} :
                  </p>
                  
                  {speciesHealth?.editorial?.diseases && speciesHealth.editorial.diseases.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                          {t('species.commonDiseases')}
                        </h3>
                        <ul className="space-y-2">
                          {speciesHealth.editorial.diseases.map((disease: any, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>{disease.name}</strong>
                              {disease.symptoms && ` - ${disease.symptoms}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {speciesHealth.editorial.diseases[0]?.prevention && (
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                            {t('species.prevention')}
                          </h3>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {speciesHealth.editorial.diseases[0].prevention}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                      <li>Maintenez un environnement adapté (température, humidité)</li>
                      <li>Suivez un programme d'alimentation régulier</li>
                      <li>Vérifiez les équipements (UVB, chauffage) régulièrement</li>
                      <li>Surveillez les signes de maladie</li>
                    </ul>
                  )}
                  
                  <Link
                    href={`/species/${animal.speciesId}`}
                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mt-4"
                  >
                    {t('species.viewFullGuide')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {t('common.loading')}
                </p>
              )}
            </div>

            {/* Notes */}
            {animal.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                  {t('animals.notes')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {animal.notes}
                </p>
              </div>
            )}

            {/* Species Information Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-0 px-6">
                  <button
                    onClick={() => setActiveTab('health')}
                    className={`px-4 py-3 font-medium transition-colors ${
                      activeTab === 'health'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600'
                    }`}
                  >
                    {t('species.health')}
                  </button>
                  <button
                    onClick={() => setActiveTab('legislation')}
                    className={`px-4 py-3 font-medium transition-colors ${
                      activeTab === 'legislation'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600'
                    }`}
                  >
                    {t('species.legal')}
                  </button>
                  <button
                    onClick={() => setActiveTab('equipment')}
                    className={`px-4 py-3 font-medium transition-colors ${
                      activeTab === 'equipment'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600'
                    }`}
                  >
                    {t('species.equipment')}
                  </button>
                  <button
                    onClick={() => setActiveTab('food')}
                    className={`px-4 py-3 font-medium transition-colors ${
                      activeTab === 'food'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600'
                    }`}
                  >
                    {t('species.food')}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Health Tab */}
                {activeTab === 'health' && (
                  <div className="space-y-4">
                    {speciesHealth?.editorial?.diseases && speciesHealth.editorial.diseases.length > 0 ? (
                      <div className="space-y-4">
                        {speciesHealth.editorial.diseases.map((disease: any, idx: number) => (
                          <div key={idx}>
                            <h3 className="font-semibold text-gray-800 dark:text-white">{disease.name}</h3>
                            {disease.symptoms && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <strong>{t('species.symptoms')}:</strong> {disease.symptoms}
                              </p>
                            )}
                            {disease.prevention && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <strong>{t('species.prevention')}:</strong> {disease.prevention}
                              </p>
                            )}
                            {disease.whenToConsult && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <strong>Quand consulter:</strong> {disease.whenToConsult}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">{t('common.noData') || 'Aucune donnée'}</p>
                    )}
                  </div>
                )}

                {/* Legislation Tab - API returns { editorial: [{ country, status, details, sources }] } */}
                {activeTab === 'legislation' && (
                  <div className="space-y-4">
                    {speciesLegislation?.editorial && speciesLegislation.editorial.length > 0 ? (
                      speciesLegislation.editorial.map((item: { country: string; status: string; details?: { citesAppendix?: string | null; euAnnex?: string | null; permits?: string[]; restrictions?: string[] }; sources?: string[] }) => (
                        <div key={item.country} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-800 dark:text-white">
                              {item.country === 'FR' ? 'France' : item.country === 'US' ? 'États-Unis' : item.country === 'BE' ? 'Belgique' : item.country}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'allowed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              item.status === 'prohibited' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {item.status === 'allowed' ? (t('species.allowed') || 'Autorisé') : item.status === 'prohibited' ? (t('species.prohibited') || 'Interdit') : (t('species.permitRequired') || 'Permis requis')}
                            </span>
                          </div>
                          {item.details?.citesAppendix && (
                            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>CITES:</strong> Annexe {item.details.citesAppendix}</p>
                          )}
                          {item.details?.euAnnex && (
                            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>UE Annexe:</strong> {item.details.euAnnex}</p>
                          )}
                          {item.details?.permits && item.details.permits.length > 0 && (
                            <div className="text-sm mt-1">
                              <strong>Permis requis:</strong>
                              <ul className="list-disc list-inside mt-0.5">
                                {item.details.permits.map((permit: string, idx: number) => (
                                  <li key={idx}>{permit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.details?.restrictions && item.details.restrictions.length > 0 && (
                            <div className="text-sm mt-1">
                              <strong>Restrictions:</strong>
                              <ul className="list-disc list-inside mt-0.5">
                                {item.details.restrictions.map((restriction: string, idx: number) => (
                                  <li key={idx}>{restriction}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.sources && item.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sources</p>
                              {item.sources.slice(0, 2).map((src: string, idx: number) => (
                                <a key={idx} href={src.startsWith('http') ? src : '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline break-all block">{src}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">{t('species.noLegalData') || t('common.noData') || 'Aucune donnée législation'}</p>
                    )}
                  </div>
                )}

                {/* Equipment Tab */}
                {activeTab === 'equipment' && (
                  <div className="space-y-3">
                    {speciesEquipment?.recommendations && speciesEquipment.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        {speciesEquipment.recommendations.map((equipment: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <p className="font-semibold text-gray-800 dark:text-white">{equipment.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {equipment.category}
                              {equipment.size && ` - ${equipment.size}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">{t('common.noData') || 'Aucune donnée'}</p>
                    )}
                  </div>
                )}

                {/* Food Tab */}
                {activeTab === 'food' && (
                  <div className="space-y-3">
                    {speciesFood && speciesFood.length > 0 ? (
                      <div className="space-y-3">
                        {speciesFood.slice(0, 5).map((food: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {food.product_name || food.name}
                            </p>
                            {food.brands && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{food.brands}</p>
                            )}
                            {food.categories && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{food.categories}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">{t('common.noData') || 'Aucune donnée'}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Carnet de santé + Routines */}
          <div className="space-y-6">
            {/* Carnet de santé */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {t('animals.healthRecord')}
                </h2>
                <button
                  type="button"
                  onClick={openHealthModalForCreate}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  + {t('animals.healthRecordAdd')}
                </button>
              </div>
              {healthRecords.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    {t('animals.healthRecordEmpty')}
                  </p>
                  <button
                    type="button"
                    onClick={openHealthModalForCreate}
                    className="rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    + {t('animals.healthRecordAdd')}
                  </button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {healthRecords.map((record) => (
                    <li
                      key={record.id}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                            {getHealthRecordTypeName(record.type)}
                          </span>
                          <p className="font-semibold text-gray-800 dark:text-white truncate text-base">
                            {record.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatDate(record.date)}
                          </p>
                          {record.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                              {record.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openHealthModalForEdit(record)}
                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                            title={t('common.edit')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHealthRecord(record.id)}
                            disabled={healthDeletingId === record.id}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50 transition-colors"
                            title={t('common.delete')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* QR code */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {t('premiumLock.qrCode')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('premiumLock.qrCodeHelp')}
              </p>
              <button
                type="button"
                onClick={handleOpenQR}
                disabled={qrLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {qrLoading ? t('common.loading') : t('premiumLock.qrCodeButton')}
              </button>
            </div>

            {/* Routines */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {t('routines.title')}
                </h2>
                <button 
                  onClick={openRoutineModalForCreate}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  + {t('routines.addRoutine')}
                </button>
              </div>

              {routines.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {t('animals.noRoutines')}
                  </p>
                  <button 
                    onClick={openRoutineModalForCreate}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    {t('animals.createRoutine')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className={`p-4 rounded-lg border ${
                        routine.active
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {routine.name || getRoutineTypeName(routine.type)}
                          </h3>
                          {routine.name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {getRoutineTypeName(routine.type)}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(routine.schedule as { time?: string })?.time ?? '—'} · {getFrequencyName(routine.frequency)}
                          </p>
                        </div>
                      <div className="flex items-center gap-1 shrink-0">
                          {routine.active && (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs rounded-full">
                              {t('routines.active')}
                            </span>
                          )}
                          {!routine.active && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-xs rounded-full">
                              En pause
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedRoutine = { ...routine, active: !routine.active };
                              if (!animal || !token) return;
                              
                              const toggleActive = async () => {
                                try {
                                  await api.updateRoutine(animal.id, routine.id, { active: !routine.active }, token);
                                  await fetchAnimalData();
                                } catch (err) {
                                  console.error('Error toggling routine:', err);
                                }
                              };
                              toggleActive();
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Basculer actif/pause"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => openRoutineModalForEdit(routine)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                            title={t('routines.editRoutine')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRoutineToDelete(routine.id);
                              setShowDeleteRoutineConfirm(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title={t('routines.deleteRoutine')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History link */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                {t('animals.history')}
              </h2>
              <button 
                onClick={handleOpenHistoryModal}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                {t('animals.viewHistory')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Routine Modal */}
      {showRoutineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 max-w-[384px] w-full my-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
              {editingRoutineId ? t('routines.editRoutine') : t('routines.addRoutine')}
            </h2>
            
            <form onSubmit={handleSaveRoutine} className="space-y-5">
              {/* Name (optional) */}
              <div>
                <label htmlFor="routine-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de la routine (optionnel)
                </label>
                <input
                  id="routine-name"
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  placeholder="ex. Nourriture du matin"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Type */}
              <div>
                <label htmlFor="routine-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('routines.type')} *
                </label>
                <select
                  id="routine-type"
                  value={routineType}
                  onChange={(e) => setRoutineType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="nourrissage">{t('routines.types.feeding')}</option>
                  <option value="entretien">{t('routines.types.cleaning')}</option>
                  <option value="uvb">{t('routines.types.uvb')}</option>
                  <option value="controle">{t('routines.types.health')}</option>
                </select>
              </div>

              {/* Frequency / Recurrence (same as notifications) */}
              <div>
                <label htmlFor="routine-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('routines.frequency')} *
                </label>
                <select
                  id="routine-frequency"
                  value={routineFrequency}
                  onChange={(e) => setRoutineFrequency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="daily">{t('routines.frequencies.daily')}</option>
                  <option value="every_2_days">{t('routines.frequencies.every_2_days')}</option>
                  <option value="every_3_days">{t('routines.frequencies.every_3_days')}</option>
                  <option value="weekly">{t('routines.frequencies.weekly')}</option>
                  <option value="monthly">{t('routines.frequencies.monthly')}</option>
                  <option value="once">{t('routines.frequencies.once')}</option>
                  <option value="hourly">{t('routines.frequencies.hourly')}</option>
                  <option value="custom">{t('routines.frequencies.custom')}</option>
                </select>
              </div>

              {/* Time */}
              <div>
                <label htmlFor="routine-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('routines.schedule')}
                </label>
                <input
                  id="routine-time"
                  type="time"
                  value={routineTime}
                  onChange={(e) => setRoutineTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Optional: date (once), weekDay (weekly), dayOfMonth (monthly), intervalHours (hourly) */}
              {routineFrequency === 'once' && (
                <div>
                  <label htmlFor="routine-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('notifications.date')}
                  </label>
                  <input
                    id="routine-date"
                    type="date"
                    value={routineDate}
                    onChange={(e) => setRoutineDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              {routineFrequency === 'weekly' && (
                <div>
                  <label htmlFor="routine-weekday" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('notifications.weekDay')}
                  </label>
                  <select
                    id="routine-weekday"
                    value={routineWeekDay}
                    onChange={(e) => setRoutineWeekDay(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>{t(`notifications.weekDay${d}` as any)}</option>
                    ))}
                  </select>
                </div>
              )}
              {routineFrequency === 'monthly' && (
                <div>
                  <label htmlFor="routine-daymonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jour du mois (1-31)
                  </label>
                  <input
                    id="routine-daymonth"
                    type="number"
                    min={1}
                    max={31}
                    value={routineDayOfMonth}
                    onChange={(e) => setRoutineDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              {routineFrequency === 'hourly' && (
                <div>
                  <label htmlFor="routine-interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Toutes les X heures (1-24)
                  </label>
                  <input
                    id="routine-interval"
                    type="number"
                    min={1}
                    max={24}
                    value={routineIntervalHours}
                    onChange={(e) => setRoutineIntervalHours(Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 2)))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {/* Active (both create and edit) */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routineActive}
                  onChange={(e) => setRoutineActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('routines.active')}</span>
              </label>

              {/* Error message */}
              {routineError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {routineError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={isCreatingRoutine}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isCreatingRoutine
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isCreatingRoutine ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('common.save')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoutineModal(false);
                    setEditingRoutineId(null);
                    setRoutineError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health record modal (carnet de santé) — en-tête fixe, corps scrollable, boutons fixes */}
      {showHealthModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="health-modal-title"
          onClick={(e) => e.target === e.currentTarget && (setShowHealthModal(false), setHealthError(''))}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] min-h-[320px] flex flex-col rounded-2xl bg-white shadow-xl dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-gray-200 dark:border-gray-600">
              <h2 id="health-modal-title" className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {editingHealthId ? t('common.edit') : t('animals.healthRecordAdd')}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('animals.healthRecordFormIntro')}
              </p>
            </div>

            <form onSubmit={handleSaveHealthRecord} className="flex flex-col flex-1 min-h-0 flex overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="p-6 space-y-6">
                  {/* Type */}
                  <fieldset className="space-y-2">
                    <legend className="text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.healthRecordType')} <span className="text-red-500">*</span>
                    </legend>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.healthRecordTypeHelp')}
                    </p>
                    <div className="grid gap-2 mt-3" role="radiogroup" aria-label={t('animals.healthRecordType')}>
                      {(['vaccine', 'surgery', 'specific_food', 'medical_history'] as const).map((type) => (
                        <label
                          key={type}
                          className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                            healthFormType === type
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                              : 'border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="health-type"
                            value={type}
                            checked={healthFormType === type}
                            onChange={() => setHealthFormType(type)}
                            className="w-5 h-5 shrink-0 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {t(`animals.healthRecordTypes.${type}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Titre */}
                  <div className="space-y-1.5">
                    <label htmlFor="health-title" className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.healthRecordTitle')} <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.healthRecordTitleHelp')}
                    </p>
                    <input
                      id="health-title"
                      type="text"
                      value={healthFormTitle}
                      onChange={(e) => setHealthFormTitle(e.target.value)}
                      placeholder={t('animals.healthRecordPlaceholderTitle')}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                      autoComplete="off"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label htmlFor="health-date" className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.healthRecordDate')} <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.healthRecordDateHelp')}
                    </p>
                    <input
                      id="health-date"
                      type="date"
                      value={healthFormDate}
                      onChange={(e) => setHealthFormDate(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label htmlFor="health-notes" className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.healthRecordNotes')}
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.healthRecordNotesHelp')}
                    </p>
                    <textarea
                      id="health-notes"
                      value={healthFormNotes}
                      onChange={(e) => setHealthFormNotes(e.target.value)}
                      placeholder={t('animals.healthRecordPlaceholderNotes')}
                      rows={3}
                      className="w-full resize-y min-h-[88px] rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {healthError && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                      {healthError}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <button
                  type="submit"
                  disabled={healthSubmitting}
                  className={`flex-1 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors ${
                    healthSubmitting
                      ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
                  }`}
                >
                  {healthSubmitting ? t('common.loading') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowHealthModal(false); setHealthError(''); }}
                  className="flex-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Animal Modal — même structure que carnet de santé (en-tête, scroll, boutons fixes) */}
      {showEditAnimalModal && animal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-animal-modal-title"
          onClick={(e) => e.target === e.currentTarget && setShowEditAnimalModal(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] min-h-[320px] flex flex-col rounded-2xl bg-white shadow-xl dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-gray-200 dark:border-gray-600">
              <h2 id="edit-animal-modal-title" className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {t('animals.editAnimal')}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('animals.editAnimalFormIntro')}
              </p>
            </div>

            <form onSubmit={handleSaveEditAnimal} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="p-6 space-y-6">
                  {/* Nom */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-animal-name" className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.animalName')} <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.nameHelp')}
                    </p>
                    <input
                      id="edit-animal-name"
                      type="text"
                      value={editAnimalName}
                      onChange={(e) => setEditAnimalName(e.target.value)}
                      placeholder={t('animals.namePlaceholder')}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>

                  {/* Date de naissance */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-animal-birthdate" className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.birthDate')}
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.birthDateHelp')}
                    </p>
                    <input
                      id="edit-animal-birthdate"
                      type="date"
                      value={editAnimalBirthDate}
                      onChange={(e) => setEditAnimalBirthDate(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Sexe */}
                  <fieldset className="space-y-2">
                    <legend className="text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.sex')}
                    </legend>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.sexHelp')}
                    </p>
                    <div className="grid gap-2 mt-3" role="radiogroup" aria-label={t('animals.sex')}>
                      {['male', 'female', 'unknown'].map((sex) => (
                        <label
                          key={sex}
                          className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                            editAnimalSex === sex
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                              : 'border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="edit-animal-sex"
                            value={sex}
                            checked={editAnimalSex === sex}
                            onChange={() => setEditAnimalSex(sex)}
                            className="w-5 h-5 shrink-0 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {t(`animals.${sex}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Photo de profil */}
                  <div className="space-y-1.5">
                    <label className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.profilePhoto')}
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.profilePhotoHelp')}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-900/30 dark:file:text-emerald-200 file:font-medium rounded-xl border-2 border-gray-200 dark:border-gray-600 border-dashed p-3"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const r = new FileReader();
                        r.onload = () => setEditAnimalProfilePhotoUrl(r.result as string);
                        r.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                    <input
                      id="edit-animal-profile-photo"
                      type="url"
                      value={editAnimalProfilePhotoUrl.startsWith('data:') ? '' : editAnimalProfilePhotoUrl}
                      onChange={(e) => setEditAnimalProfilePhotoUrl(e.target.value)}
                      placeholder={t('animals.profilePhotoPlaceholder')}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 mt-2"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-animal-notes" className="block text-base font-semibold text-gray-900 dark:text-white">
                      {t('animals.notes')}
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('animals.notesHelp')}
                    </p>
                    <textarea
                      id="edit-animal-notes"
                      value={editAnimalNotes}
                      onChange={(e) => setEditAnimalNotes(e.target.value)}
                      placeholder={t('animals.notesPlaceholder')}
                      rows={3}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {editAnimalError && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                      {editAnimalError}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <button
                  type="submit"
                  disabled={editAnimalSubmitting}
                  className={`flex-1 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors ${
                    editAnimalSubmitting
                      ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
                  }`}
                >
                  {editAnimalSubmitting ? t('common.loading') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditAnimalModal(false)}
                  className="flex-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR code modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-[384px]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('premiumLock.qrCode')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('premiumLock.qrCodeHelp')}</p>
            {qrLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent" />
              </div>
            ) : qrDataUrl ? (
              <div className="flex flex-col items-center">
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-lg bg-white p-2" />
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 break-all text-center max-w-full">{qrUrl}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="mt-4 w-full py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Delete routine confirmation */}
      {showDeleteRoutineConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-[384px] w-full">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              {t('routines.deleteRoutine')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {t('common.confirmDelete')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteRoutine}
                disabled={isDeletingRoutine}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingRoutine ? t('common.loading') : t('common.delete')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteRoutineConfirm(false);
                  setRoutineToDelete(null);
                }}
                disabled={isDeletingRoutine}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {t('animals.history')}
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
              </div>
            ) : historyError ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                {historyError}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('animals.noHistory') || 'Aucun historique'}
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {entry.type}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.doneAt).toLocaleDateString()} {new Date(entry.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {entry.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-[384px] w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {t('animals.deleteAnimal')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('common.confirmDelete') || `Êtes-vous sûr de vouloir supprimer ${animal?.name} ? Cette action est irréversible.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAnimal}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {t('common.loading')}
                  </>
                ) : (
                  t('animals.deleteAnimal')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
