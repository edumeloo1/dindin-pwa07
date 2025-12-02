import React, { useState, useCallback } from 'react';
import { User, CategoryConfig, Account } from '../types';
import * as LucideIcons from 'lucide-react';
import { EMOJI_OPTIONS } from '../constants';
import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from "firebase/storage";

interface SettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User, successMessage: string) => void;
}

const getAccountTypeName = (type: Account['type']) => {
  switch (type) {
    case 'bank': return 'Banco';
    case 'credit_card': return 'Cartão de Crédito';
    case 'cash': return 'Dinheiro';
    case 'pix': return 'Pix';
    default: return type;
  }
};

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'accounts'>('profile');
  
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(EMOJI_OPTIONS[0]);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('bank');

  const handleProfileSave = async () => {
    let finalPhotoUrl = photoUrl;
    // Check if photoUrl is a new base64 upload
    if (photoUrl && photoUrl.startsWith('data:image')) {
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `profile_photos/${user.id}`);
        const snapshot = await uploadString(storageRef, photoUrl, 'data_url');
        finalPhotoUrl = await getDownloadURL(snapshot.ref);
        setIsUploading(false);
      } catch (error) {
        console.error("Error uploading photo: ", error);
        setIsUploading(false);
        // Let onUpdateUser handle the notification
        onUpdateUser({ ...user }, "Erro ao enviar a foto. Tente uma imagem menor."); 
        return;
      }
    }
    onUpdateUser({ ...user, name, email, photoUrl: finalPhotoUrl }, "Perfil salvo com sucesso!");
  };
  
  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) handleFileSelect(event.dataTransfer.files[0]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(false);
  }, []);

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: CategoryConfig = { id: `cat-${Date.now()}`, name: newCategoryName, icon: newCategoryIcon, isVisible: true };
    onUpdateUser({ ...user, categories: [...user.categories, newCat] }, "Categoria adicionada!");
    setNewCategoryName('');
  };
  
  const toggleCategoryVisibility = (id: string) => {
    const newCategories = user.categories.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c);
    onUpdateUser({ ...user, categories: newCategories }, "Visibilidade da categoria alterada!");
  };

  const deleteCategory = (id: string) => {
    onUpdateUser({ ...user, categories: user.categories.filter(c => c.id !== id) }, "Categoria excluída!");
  };

  const addAccount = () => {
    if (!newAccountName.trim()) return;
    const newAcc: Account = { id: `acc-${Date.now()}`, name: newAccountName, type: newAccountType };
    onUpdateUser({ ...user, accounts: [...user.accounts, newAcc] }, "Conta adicionada!");
    setNewAccountName('');
  };

  const deleteAccount = (id: string) => {
    onUpdateUser({ ...user, accounts: user.accounts.filter(a => a.id !== id) }, "Conta excluída!");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Minha Conta</h2>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          <button onClick={() => setActiveTab('profile')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Perfil</button>
          <button onClick={() => setActiveTab('categories')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Categorias</button>
          <button onClick={() => setActiveTab('accounts')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'accounts' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Contas</button>
        </nav>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-lg animate-fade-in">
          <div className="flex items-center gap-6">
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 overflow-hidden cursor-pointer group border-2 ${isDragging ? 'border-emerald-500 border-dashed' : 'border-transparent'}`} onClick={() => document.getElementById('photo-upload')?.click()} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
              {photoUrl ? <img src={photoUrl} alt="Foto de perfil" className="w-full h-full object-cover"/> : <LucideIcons.User className="w-10 h-10"/>}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs text-center p-2"> Alterar foto </div>
            </div>
            <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}/>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
              {photoUrl && <button onClick={() => setPhotoUrl('')} className="text-xs text-red-500 hover:underline mt-2 flex items-center gap-1"> <LucideIcons.XCircle className="w-3 h-3"/> Remover Foto </button> }
            </div>
          </div>
          <div> <label className="block text-sm font-medium text-slate-700 mb-1">Email (Login)</label> <input type="email" value={email} disabled placeholder="seu@email.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"/> </div>
          <button onClick={handleProfileSave} disabled={isUploading} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:bg-slate-800 disabled:opacity-50">
            {isUploading ? 'Enviando foto...' : 'Salvar Perfil'}
          </button>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4 max-w-lg animate-fade-in">
          <p className="text-sm text-slate-500">Gerencie suas categorias. Desmarque para ocultar no formulário de transação.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {user.categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-2 pl-3 bg-slate-50 rounded-lg hover:bg-slate-100/70">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={cat.isVisible} onChange={() => toggleCategoryVisibility(cat.id)} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 shrink-0"/>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-medium text-slate-800">{cat.name}</span>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><LucideIcons.Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <h4 className="font-semibold text-slate-800">Nova Categoria</h4>
            <div className="flex gap-2 items-center">
              <select value={newCategoryIcon} onChange={e => setNewCategoryIcon(e.target.value)} className="bg-white px-3 py-2.5 border border-slate-300 rounded-lg text-xl"> {EMOJI_OPTIONS.map(emoji => <option key={emoji} value={emoji}>{emoji}</option>)} </select>
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nome da categoria" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"/>
              <button onClick={addCategory} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-4 max-w-lg animate-fade-in">
          <p className="text-sm text-slate-500">Adicione e remova contas bancárias ou cartões.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {user.accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100/70">
                <span className="font-medium text-slate-800">{acc.name} <span className="text-xs text-slate-400 capitalize">({getAccountTypeName(acc.type)})</span></span>
                <button onClick={() => deleteAccount(acc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><LucideIcons.Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
           <div className="pt-4 border-t border-slate-200 space-y-2">
            <h4 className="font-semibold text-slate-800">Nova Conta</h4>
            <div className="flex gap-2">
              <input type="text" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="Nome da Conta" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"/>
              <select value={newAccountType} onChange={e => setNewAccountType(e.target.value as any)} className="bg-white px-3 py-2 border border-slate-300 rounded-lg">
                <option value="bank">Banco</option> <option value="credit_card">Cartão de Crédito</option> <option value="pix">Pix</option> <option value="cash">Dinheiro</option>
              </select>
              <button onClick={addAccount} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;