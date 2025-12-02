import React, { useState, useEffect } from 'react';
import { WalletCards, ArrowRight, Lock, User as UserIcon, LogIn } from 'lucide-react';
import { User } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../constants';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const DB_KEY = 'meufinance_db_users';
const PHOTO_KEY_PREFIX = 'meufinance_photo_';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Auto-seed database if empty
  useEffect(() => {
    const storedUsers = localStorage.getItem(DB_KEY);
    if (!storedUsers) {
      const defaultUser: User = {
        id: 'user_default',
        name: 'Usuário Padrão',
        username: 'admin',
        password: 'admin',
        accounts: DEFAULT_ACCOUNTS,
        categories: DEFAULT_CATEGORIES,
      };
      localStorage.setItem(DB_KEY, JSON.stringify([defaultUser]));
    }
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    const dbString = localStorage.getItem(DB_KEY);
    const users: User[] = dbString ? JSON.parse(dbString) : [];

    if (isRegistering) {
      if (!name) { setError('Nome é obrigatório.'); return; }
      if (users.find(u => u.username === username)) { setError('Usuário já existe.'); return; }

      const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        username,
        password, // In a real app, this should be hashed
        accounts: DEFAULT_ACCOUNTS,
        categories: DEFAULT_CATEGORIES,
      };
      users.push(newUser);
      localStorage.setItem(DB_KEY, JSON.stringify(users));
      onLogin(newUser);
    } else {
      const user = users.find(u => u.username === username);
      
      if (user && user.password === password) {
        const photoUrl = localStorage.getItem(`${PHOTO_KEY_PREFIX}${user.id}`);
        const hydratedUser: User = {
            ...user,
            photoUrl: photoUrl || undefined,
        };
        onLogin(hydratedUser);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-xl mb-4 shadow-lg shadow-emerald-200">
            <WalletCards className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Meu DinDin</h1>
          <p className="text-slate-500 text-center mt-2">
            {isRegistering ? 'Crie sua conta para começar.' : 'Faça login para acessar suas finanças.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <div className="relative"> <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> <input type="text" required className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} /> </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
            <div className="relative"> <LogIn className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> <input type="text" required className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="usuario123" value={username} onChange={(e) => setUsername(e.target.value)} /> </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative"> <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> <input type="password" required className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="******" value={password} onChange={(e) => setPassword(e.target.value)} /> </div>
          </div>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
          <button type="submit" className="w-full bg-slate-900 text-white font-medium py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {isRegistering ? 'Criar Conta' : 'Entrar'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-sm text-emerald-600 font-semibold hover:underline">
            {isRegistering ? 'Já tenho uma conta. Fazer login.' : 'Não tem conta? Crie uma agora.'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;